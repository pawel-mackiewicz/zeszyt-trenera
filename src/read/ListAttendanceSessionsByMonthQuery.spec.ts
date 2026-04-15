import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { AttendanceList } from '@/write/domain/model/AttendanceList'
import { ListAttendanceSessionsByMonthQuery } from '@/read/ListAttendanceSessionsByMonthQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ListAttendanceSessionsByMonthQuery', () => {
  let database: TrainerNotebookDb
  let query: ListAttendanceSessionsByMonthQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(
      createTestDbName('attendance-history-read')
    )
    query = new ListAttendanceSessionsByMonthQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('lists one month of attendance sessions from newest to oldest with member counts', async () => {
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
    const februarySession = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-02-02T18:00:00Z')
      },
      'attendance-list-3'
    )[0]

    // The read model now owns month filtering and summary mapping, so this spec keeps that contract covered without pushing query behavior back into the write repository.
    await database.attendanceLists.bulkAdd([
      marchMorning.toSnapshot(),
      marchEvening.toSnapshot(),
      februarySession.toSnapshot()
    ])

    await expect(
      query.handle({
        month: new Date('2026-03-16T12:00:00Z')
      })
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
