import { afterEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { ObserveCampParticipantDetailsQuery } from '@/read/ObserveCampParticipantDetailsQuery'
import type {
  PersistedCamp,
  PersistedCampParticipant
} from '@/write/shared/infra'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

function createCampRow(overrides: Partial<PersistedCamp> = {}): PersistedCamp {
  const now = new Date('2026-06-01T00:00:00Z')

  return {
    id: 'camp-1',
    name: 'Oboz zimowy',
    note: 'Internal note hidden from participant details',
    startDate: new Date('2026-12-12T00:00:00Z'),
    finishDate: new Date('2026-12-19T00:00:00Z'),
    price: {
      amountMinor: 100000,
      currency: 'PLN'
    },
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

function createCampParticipantRow(
  overrides: Partial<PersistedCampParticipant> & {
    id: string
    campId: string
  }
): PersistedCampParticipant {
  const now = new Date('2026-06-01T00:00:00Z')

  return {
    personKey: JSON.stringify(['external', 'jane', 'doe']),
    person: {
      type: 'external' as const,
      firstName: 'jane',
      lastName: 'doe'
    },
    status: 'REGISTERED' as const,
    totalAmountDue: {
      amountMinor: 100000,
      currency: 'PLN'
    },
    discounts: [],
    financialTransactions: [],
    addedAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('camp participant details live read query', () => {
  let database: TrainerNotebookDb | undefined

  afterEach(async () => {
    if (database) {
      database.close()
      await database.delete()
    }
  })

  it('tells the camp and participant identity story for the details composable', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-details-read')
    )
    const query = new ObserveCampParticipantDetailsQuery(database)

    await database.camps.add(createCampRow())
    await database.members.add({
      id: 'member-1',
      firstName: 'Amanda',
      lastName: 'Nunes',
      dateOfBirth: new Date('1990-06-11T00:00:00Z'),
      createdAt: new Date('2025-01-01T00:00:00Z')
    })
    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-1',
        personKey: JSON.stringify(['club', 'member-1']),
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: {
          amountMinor: 80000,
          currency: 'PLN'
        },
        financialTransactions: [
          {
            type: 'payment',
            id: 'payment-1',
            amount: {
              amountMinor: 30000,
              currency: 'PLN'
            },
            note: '',
            createdAt: new Date('2026-05-03T00:00:00Z')
          }
        ]
      })
    )

    await expect(
      readObservableOnce(
        query.handle({
          campId: 'camp-1',
          participantId: 'participant-1'
        })
      )
    ).resolves.toEqual({
      camp: {
        name: 'Oboz zimowy',
        startDate: new Date('2026-12-12T00:00:00Z'),
        finishDate: new Date('2026-12-19T00:00:00Z')
      },
      participant: {
        displayName: 'Amanda Nunes',
        status: 'registered'
      }
    })
  })
})

function readObservableOnce<T>(observable: {
  subscribe(observer: { next(value: T): void; error(error: unknown): void }): {
    unsubscribe(): void
  }
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription: { unsubscribe(): void } | undefined =
      observable.subscribe({
        next(value) {
          queueMicrotask(() => subscription?.unsubscribe())
          resolve(value)
        },
        error(error) {
          reject(error)
        }
      })
  })
}
