import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { ListArchivedMembersForRosterQuery } from '@/read/ListArchivedMembersForRosterQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ListArchivedMembersForRosterQuery', () => {
  let database: TrainerNotebookDb
  let query: ListArchivedMembersForRosterQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(
      createTestDbName('archived-members-roster-read')
    )
    query = new ListArchivedMembersForRosterQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('returns only archived roster fields and excludes active members', async () => {
    await database.members.bulkAdd([
      {
        id: 'member-1',
        firstName: 'anderson',
        lastName: 'silva',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        joinedAt: new Date('2024-01-01T00:00:00Z'),
        archived: true,
        archivedAt: new Date('2026-03-01T00:00:00Z'),
        createdAt: new Date('2026-03-20T10:00:00Z')
      },
      {
        id: 'member-2',
        firstName: 'mystery',
        lastName: 'member',
        dateOfBirth: new Date('2000-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-21T10:00:00Z')
      },
      {
        id: 'member-3',
        firstName: 'georges',
        lastName: 'st-pierre',
        dateOfBirth: new Date('1981-05-19T00:00:00Z'),
        archived: true,
        createdAt: new Date('2026-03-22T10:00:00Z')
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
        id: 'member-3',
        firstName: 'georges',
        lastName: 'st-pierre',
        phoneNumber: undefined,
        dateOfBirth: new Date('1981-05-19T00:00:00Z'),
        joinedAt: undefined
      }
    ])
  })

  it('returns an empty list when no archived members are stored', async () => {
    await database.members.bulkAdd([
      {
        id: 'member-1',
        firstName: 'active',
        lastName: 'member',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-20T10:00:00Z')
      }
    ])

    await expect(query.handle()).resolves.toEqual([])
  })
})
