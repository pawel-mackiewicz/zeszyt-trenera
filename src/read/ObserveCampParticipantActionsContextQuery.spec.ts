import { afterEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { ObserveCampParticipantActionsContextQuery } from '@/read/ObserveCampParticipantActionsContextQuery'
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
    note: 'Internal note hidden from participant actions',
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

describe('camp participant actions context live read query', () => {
  let database: TrainerNotebookDb | undefined

  afterEach(async () => {
    if (database) {
      database.close()
      await database.delete()
    }
  })

  it('tells the available actions story from the participant status and balance', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-actions-read')
    )
    const query = new ObserveCampParticipantActionsContextQuery(database)

    await database.camps.add(createCampRow())
    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-1',
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
      canAcceptResignation: true,
      canGrantDiscount: true,
      canRegisterPayment: true,
      canRegisterRefund: true,
      paymentPrefillAmount: {
        amountMinor: 50000,
        currency: 'PLN'
      },
      refundableBalance: {
        amountMinor: 30000,
        currency: 'PLN'
      },
      subject: {
        campName: 'Oboz zimowy',
        participantDisplayName: 'jane doe'
      },
      status: 'registered'
    })
  })

  it('does not offer a refund path when the participant has no refundable balance', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-actions-no-refund-read')
    )
    const query = new ObserveCampParticipantActionsContextQuery(database)

    await database.camps.add(createCampRow())
    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-1'
      })
    )

    await expect(
      readObservableOnce(
        query.handle({
          campId: 'camp-1',
          participantId: 'participant-1'
        })
      )
    ).resolves.toMatchObject({
      canRegisterRefund: false,
      refundableBalance: {
        amountMinor: 0,
        currency: 'PLN'
      },
      status: 'registered'
    })
  })

  it('does not offer a refund path after the participant refund story is closed', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-actions-refunded-read')
    )
    const query = new ObserveCampParticipantActionsContextQuery(database)

    await database.camps.add(createCampRow())
    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-1',
        status: 'REFUNDED',
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
          },
          {
            type: 'refund',
            id: 'refund-1',
            amount: {
              amountMinor: 30000,
              currency: 'PLN'
            },
            note: '',
            createdAt: new Date('2026-05-04T00:00:00Z')
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
    ).resolves.toMatchObject({
      canRegisterRefund: false,
      refundableBalance: {
        amountMinor: 0,
        currency: 'PLN'
      },
      status: 'resigned'
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
