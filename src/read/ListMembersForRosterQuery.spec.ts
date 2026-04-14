import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { ListMembersForRosterQuery } from '@/read/ListMembersForRosterQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ListMembersForRosterQuery', () => {
  let database: TrainerNotebookDb
  let query: ListMembersForRosterQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('members-roster-read'))
    query = new ListMembersForRosterQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('returns only roster fields needed by the members screen', async () => {
    await database.members.bulkAdd([
      {
        id: 'member-1',
        firstName: 'anderson',
        lastName: 'silva',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        joinedAt: new Date('2024-01-01T00:00:00Z'),
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
        firstName: 'anderson',
        lastName: 'silva',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        joinedAt: new Date('2024-01-01T00:00:00Z')
      },
      {
        id: 'member-2',
        firstName: 'mystery',
        lastName: 'member',
        phoneNumber: undefined,
        dateOfBirth: undefined,
        joinedAt: undefined
      }
    ])
  })

  it('returns an empty list when no members are persisted', async () => {
    await expect(query.handle()).resolves.toEqual([])
  })
})
