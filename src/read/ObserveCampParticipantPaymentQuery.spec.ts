import { afterEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { ObserveCampParticipantPaymentQuery } from '@/read/ObserveCampParticipantPaymentQuery'
import type { PersistedCampParticipant } from '@/write/shared/infra'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
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

describe('camp participant payment live read query', () => {
  let database: TrainerNotebookDb | undefined

  afterEach(async () => {
    if (database) {
      database.close()
      await database.delete()
    }
  })

  it('tells the active payment progress story from the participant money data', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-payment-read')
    )
    const query = new ObserveCampParticipantPaymentQuery(database)

    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-1',
        totalAmountDue: {
          amountMinor: 80000,
          currency: 'PLN'
        },
        discounts: [
          {
            id: 'discount-1',
            amount: {
              amountMinor: 15000,
              currency: 'PLN'
            },
            reason: 'siblings',
            createdAt: new Date('2026-05-01T00:00:00Z')
          },
          {
            id: 'discount-2',
            amount: {
              amountMinor: 5000,
              currency: 'PLN'
            },
            reason: 'coach decision',
            createdAt: new Date('2026-05-02T00:00:00Z')
          }
        ],
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
      amountDue: {
        amountMinor: 80000,
        currency: 'PLN'
      },
      discountSum: {
        amountMinor: 20000,
        currency: 'PLN'
      },
      paidAmount: {
        amountMinor: 30000,
        currency: 'PLN'
      },
      paymentProgressPercent: 37,
      status: 'registered'
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
