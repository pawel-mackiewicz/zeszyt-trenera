import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { AttendanceList } from '@/domain/model/AttendanceList'
import { GetAttendanceSessionByIdQuery } from '@/read/GetAttendanceSessionByIdQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('GetAttendanceSessionByIdQuery', () => {
  let database: TrainerNotebookDb
  let query: GetAttendanceSessionByIdQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('attendance-session'))
    query = new GetAttendanceSessionByIdQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('returns one saved attendance session for editor hydration', async () => {
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T18:00:00Z')
      },
      'attendance-list-1'
    )

    await database.attendanceLists.add(attendanceList.toSnapshot())

    await expect(
      query.handle({
        attendanceListId: 'attendance-list-1'
      })
    ).resolves.toEqual({
      id: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T18:00:00Z')
    })
  })

  it('returns null when the attendance session does not exist', async () => {
    await expect(
      query.handle({
        attendanceListId: 'missing-session'
      })
    ).resolves.toBeNull()
  })
})
