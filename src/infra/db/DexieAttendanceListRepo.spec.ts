import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AttendanceList } from '@/domain/model/AttendanceList'
import { TrainerNotebookDb } from '@/infra/db'
import { DexieAttendanceListRepo } from '@/infra/db/DexieAttendanceListRepo'

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

  it('lists attendance sessions from one month sorted from newest to oldest', async () => {
    const marchMorning = AttendanceList.record(
      {
        memberIds: ['member-1'],
        start: new Date('2026-03-05T08:00:00Z')
      },
      'attendance-list-1'
    )[0]
    const marchEvening = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2', 'member-3'],
        start: new Date('2026-03-27T18:00:00Z')
      },
      'attendance-list-2'
    )[0]
    const aprilSession = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-02-02T18:00:00Z')
      },
      'attendance-list-3'
    )[0]

    await repository.save(marchMorning)
    await repository.save(marchEvening)
    await repository.save(aprilSession)

    await expect(
      repository.listByStartRange(
        new Date('2026-03-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z')
      )
    ).resolves.toEqual([
      {
        id: 'attendance-list-2',
        start: new Date('2026-03-27T18:00:00Z'),
        attendanceCount: 3
      },
      {
        id: 'attendance-list-1',
        start: new Date('2026-03-05T08:00:00Z'),
        attendanceCount: 1
      }
    ])
  })
})
