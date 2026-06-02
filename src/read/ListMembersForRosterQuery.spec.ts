import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Observable } from 'dexie'

import { TrainerNotebookDb } from '@/db'
import { ObserveMembersForRosterQuery } from '@/read/ObserveMembersForRosterQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ObserveMembersForRosterQuery', () => {
  let database: TrainerNotebookDb
  let query: ObserveMembersForRosterQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('members-roster-read'))
    query = new ObserveMembersForRosterQuery(database)
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
        dateOfBirth: new Date('2000-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-21T10:00:00Z')
      },
      {
        id: 'member-archived',
        firstName: 'old',
        lastName: 'member',
        dateOfBirth: new Date('1998-01-01T00:00:00Z'),
        archived: true,
        archivedAt: new Date('2026-03-22T10:00:00Z'),
        createdAt: new Date('2026-03-22T10:00:00Z')
      }
    ])

    await expect(waitForFirstEmission(query.handle())).resolves.toEqual([
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
        dateOfBirth: new Date('2000-01-01T00:00:00Z'),
        joinedAt: undefined
      }
    ])
  })

  it('returns an empty list when no members are persisted', async () => {
    await expect(waitForFirstEmission(query.handle())).resolves.toEqual([])
  })
})

function waitForFirstEmission<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next(value) {
        queueMicrotask(() => subscription.unsubscribe())
        resolve(value)
      },
      error(error) {
        queueMicrotask(() => subscription.unsubscribe())
        reject(error)
      }
    })
  })
}
