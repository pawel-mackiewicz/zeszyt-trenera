import { afterEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { GetCampDetailsQuery } from '@/read/GetCampDetailsQuery'
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

describe('GetCampDetailsQuery', () => {
  let database: TrainerNotebookDb | undefined

  afterEach(async () => {
    if (database) {
      database.close()
      await database.delete()
    }
  })

  it('returns null for a missing camp', async () => {
    database = new TrainerNotebookDb(createTestDbName('camp-details-missing'))
    const query = new GetCampDetailsQuery(database)

    await expect(query.handle({ campId: 'missing-camp' })).resolves.toBeNull()
  })

  it('returns camp details with active payment rows and resigned refund rows for the camp details view', async () => {
    database = new TrainerNotebookDb(createTestDbName('camp-details'))
    const query = new GetCampDetailsQuery(
      database,
      () => new Date('2026-06-10T12:00:00Z')
    )

    await database.camps.add({
      id: 'camp-1',
      name: 'Oboz zimowy',
      note: 'Internal note hidden from the details header',
      startDate: new Date('2026-12-12T00:00:00Z'),
      finishDate: new Date('2026-12-19T00:00:00Z'),
      price: {
        amountMinor: 100000,
        currency: 'PLN'
      },
      createdAt: new Date('2026-05-01T00:00:00Z'),
      updatedAt: new Date('2026-05-01T00:00:00Z')
    })
    await database.camps.add({
      id: 'camp-2',
      name: 'Other camp',
      note: '',
      startDate: new Date('2026-11-12T00:00:00Z'),
      finishDate: new Date('2026-11-19T00:00:00Z'),
      price: {
        amountMinor: 90000,
        currency: 'PLN'
      },
      createdAt: new Date('2026-05-01T00:00:00Z'),
      updatedAt: new Date('2026-05-01T00:00:00Z')
    })
    await database.members.add({
      id: 'member-1',
      firstName: 'Amanda',
      lastName: 'Nunes',
      dateOfBirth: new Date('1990-06-11T00:00:00Z'),
      createdAt: new Date('2025-01-01T00:00:00Z')
    })
    await database.campParticipants.bulkAdd([
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
        discounts: [
          {
            id: 'discount-1',
            amount: {
              amountMinor: 20000,
              currency: 'PLN'
            },
            reason: 'Sibling discount',
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
      }),
      createCampParticipantRow({
        id: 'participant-2',
        campId: 'camp-1',
        status: 'FULLY_PAID',
        person: {
          type: 'external',
          firstName: 'royce',
          lastName: 'gracie'
        },
        personKey: JSON.stringify(['external', 'royce', 'gracie']),
        financialTransactions: [
          {
            type: 'payment',
            id: 'payment-2',
            amount: {
              amountMinor: 100000,
              currency: 'PLN'
            },
            note: '',
            createdAt: new Date('2026-05-03T00:00:00Z')
          }
        ]
      }),
      createCampParticipantRow({
        id: 'participant-3',
        campId: 'camp-1',
        status: 'RESIGNED',
        financialTransactions: [
          {
            type: 'payment',
            id: 'payment-3',
            amount: {
              amountMinor: 50000,
              currency: 'PLN'
            },
            note: '',
            createdAt: new Date('2026-05-03T00:00:00Z')
          }
        ]
      }),
      createCampParticipantRow({
        id: 'participant-4',
        campId: 'camp-1',
        status: 'REFUNDED'
      }),
      createCampParticipantRow({
        id: 'participant-other',
        campId: 'camp-2'
      })
    ])

    const result = await query.handle({ campId: 'camp-1' })

    expect(result).toEqual({
      camp: {
        id: 'camp-1',
        name: 'Oboz zimowy',
        startDate: new Date('2026-12-12T00:00:00Z'),
        finishDate: new Date('2026-12-19T00:00:00Z')
      },
      participants: {
        registered: [
          {
            id: 'participant-1',
            displayName: 'Amanda Nunes',
            age: 35,
            amountDue: {
              amountMinor: 80000,
              currency: 'PLN'
            },
            paidAmount: {
              amountMinor: 30000,
              currency: 'PLN'
            },
            paymentProgressPercent: 37,
            hasDiscount: true
          }
        ],
        fullyPaid: [
          {
            id: 'participant-2',
            displayName: 'royce gracie',
            age: null,
            amountDue: {
              amountMinor: 100000,
              currency: 'PLN'
            },
            paidAmount: {
              amountMinor: 100000,
              currency: 'PLN'
            },
            paymentProgressPercent: 100,
            hasDiscount: false
          }
        ],
        resigned: [
          {
            id: 'participant-3',
            displayName: 'jane doe',
            age: null,
            amountToRefund: {
              amountMinor: 50000,
              currency: 'PLN'
            }
          },
          {
            id: 'participant-4',
            displayName: 'jane doe',
            age: null,
            amountToRefund: {
              amountMinor: 0,
              currency: 'PLN'
            }
          }
        ]
      }
    })
  })
})
