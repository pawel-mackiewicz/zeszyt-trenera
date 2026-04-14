import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { ListMembersForAttendanceEditorQuery } from '@/read/ListMembersForAttendanceEditorQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ListMembersForAttendanceEditorQuery', () => {
  let database: TrainerNotebookDb
  let query: ListMembersForAttendanceEditorQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(
      createTestDbName('attendance-members-read')
    )
    query = new ListMembersForAttendanceEditorQuery(
      database,
      () => new Date('2026-04-01T12:00:00Z')
    )
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('returns attendance members with derived ages and no extra fields', async () => {
    await database.members.bulkAdd([
      {
        id: 'member-1',
        firstName: 'amanda',
        lastName: 'nunes',
        dateOfBirth: new Date('1988-05-30T00:00:00Z'),
        createdAt: new Date('2026-03-20T10:00:00Z')
      },
      {
        id: 'member-2',
        firstName: 'mystery',
        lastName: 'member',
        createdAt: new Date('2026-03-21T10:00:00Z')
      }
    ])

    await expect(query.handle()).resolves.toEqual([
      {
        id: 'member-1',
        firstName: 'amanda',
        lastName: 'nunes',
        age: 37
      },
      {
        id: 'member-2',
        firstName: 'mystery',
        lastName: 'member',
        age: null
      }
    ])
  })

  it('returns an empty list when no members are stored', async () => {
    await expect(query.handle()).resolves.toEqual([])
  })
})
