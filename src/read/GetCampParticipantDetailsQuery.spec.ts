import { afterEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { GetCampParticipantDetailsQuery } from '@/read/GetCampParticipantDetailsQuery'
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

describe('GetCampParticipantDetailsQuery', () => {
  let database: TrainerNotebookDb | undefined

  afterEach(async () => {
    if (database) {
      database.close()
      await database.delete()
    }
  })

  it('returns only the selected active participant data that the details screen needs', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-details-active')
    )
    const query = new GetCampParticipantDetailsQuery(database)

    await database.camps.bulkAdd([
      createCampRow(),
      createCampRow({
        id: 'camp-2',
        name: 'Other camp'
      })
    ])
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
        campId: 'camp-1'
      }),
      createCampParticipantRow({
        id: 'participant-other-camp',
        campId: 'camp-2'
      })
    ])

    const result = await query.handle({
      campId: 'camp-1',
      participantId: 'participant-1'
    })

    expect(result).toEqual({
      camp: {
        name: 'Oboz zimowy',
        startDate: new Date('2026-12-12T00:00:00Z'),
        finishDate: new Date('2026-12-19T00:00:00Z')
      },
      participant: {
        displayName: 'Amanda Nunes',
        status: 'registered',
        amountDue: {
          amountMinor: 80000,
          currency: 'PLN'
        },
        paidAmount: {
          amountMinor: 30000,
          currency: 'PLN'
        },
        paymentProgressPercent: 37
      }
    })
  })

  it('returns only refund data when the selected participant has resigned', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-details-resigned')
    )
    const query = new GetCampParticipantDetailsQuery(database)

    await database.camps.add(createCampRow())
    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-1',
        status: 'RESIGNED',
        financialTransactions: [
          {
            type: 'payment',
            id: 'payment-1',
            amount: {
              amountMinor: 50000,
              currency: 'PLN'
            },
            note: '',
            createdAt: new Date('2026-05-03T00:00:00Z')
          }
        ]
      })
    )

    const result = await query.handle({
      campId: 'camp-1',
      participantId: 'participant-1'
    })

    expect(result).toEqual({
      camp: {
        name: 'Oboz zimowy',
        startDate: new Date('2026-12-12T00:00:00Z'),
        finishDate: new Date('2026-12-19T00:00:00Z')
      },
      participant: {
        displayName: 'jane doe',
        status: 'resigned',
        amountToRefund: {
          amountMinor: 50000,
          currency: 'PLN'
        }
      }
    })
  })

  it('returns nothing when the participant does not belong to the requested camp', async () => {
    database = new TrainerNotebookDb(
      createTestDbName('camp-participant-details-mismatch')
    )
    const query = new GetCampParticipantDetailsQuery(database)

    await database.camps.bulkAdd([
      createCampRow(),
      createCampRow({
        id: 'camp-2',
        name: 'Other camp'
      })
    ])
    await database.campParticipants.add(
      createCampParticipantRow({
        id: 'participant-1',
        campId: 'camp-2'
      })
    )

    await expect(
      query.handle({
        campId: 'camp-1',
        participantId: 'participant-1'
      })
    ).resolves.toBeNull()
  })
})
