import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AttendanceList } from '@/write/attendance/domain/AttendanceList'
import { TrainerNotebookDb } from '@/db'
import { DexieAttendanceListRepo } from '@/write/attendance/infra/db/DexieAttendanceListRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieAttendanceListRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieAttendanceListRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('attendance-list-repo'))
    repository = new DexieAttendanceListRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists an attendance list into Dexie', async () => {
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T18:00:00Z')
      },
      'attendance-list-1'
    )

    await repository.save(attendanceList)

    const persistedAttendanceLists = await database.attendanceLists.toArray()

    expect(persistedAttendanceLists).toHaveLength(1)
    expect(persistedAttendanceLists[0]).toMatchObject({
      id: attendanceList.id,
      memberIds: attendanceList.memberIds,
      start: attendanceList.start,
      createdAt: attendanceList.createdAt
    })
  })

  it('loads one attendance list back as a rehydrated aggregate', async () => {
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T18:00:00Z')
      },
      'attendance-list-1'
    )

    await repository.save(attendanceList)

    await expect(repository.findById('attendance-list-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'attendance-list-1',
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T18:00:00Z'),
        createdAt: attendanceList.createdAt
      })
    )
  })

  it('updates an existing attendance list in Dexie', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T18:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })

    await repository.save(existingAttendanceList)

    const [updatedAttendanceList] = AttendanceList.update(
      existingAttendanceList,
      {
        attendanceListId: 'attendance-list-1',
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T19:00:00Z')
      }
    )

    await repository.update(updatedAttendanceList)

    const persistedAttendanceLists = await database.attendanceLists.toArray()

    expect(persistedAttendanceLists).toEqual([
      {
        id: 'attendance-list-1',
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T19:00:00Z'),
        createdAt: new Date('2026-03-01T10:00:00Z')
      }
    ])
  })

  it('deletes an attendance list from Dexie', async () => {
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T18:00:00Z')
      },
      'attendance-list-1'
    )

    await repository.save(attendanceList)
    await repository.delete('attendance-list-1')

    await expect(database.attendanceLists.toArray()).resolves.toEqual([])
  })

  it('ignores deletion for an unknown attendance list id', async () => {
    await repository.delete('missing-attendance-list')

    await expect(database.attendanceLists.toArray()).resolves.toEqual([])
  })

  it('reports when no attendance list exists for a training start yet', async () => {
    await expect(
      repository.existsByStart(new Date('2026-03-27T18:00:00Z'))
    ).resolves.toBe(false)
  })

  it('reports when an attendance list already exists for a training start', async () => {
    const start = new Date('2026-03-27T18:00:00Z')
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: ['member-1'],
        start
      },
      'attendance-list-1'
    )

    await repository.save(attendanceList)

    await expect(repository.existsByStart(start)).resolves.toBe(true)
  })

  it('does not treat a different training start as a duplicate', async () => {
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: ['member-1'],
        start: new Date('2026-03-27T18:00:00Z')
      },
      'attendance-list-1'
    )

    await repository.save(attendanceList)

    await expect(
      repository.existsByStart(new Date('2026-03-27T19:00:00Z'))
    ).resolves.toBe(false)
  })
})
