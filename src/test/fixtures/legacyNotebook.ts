import Dexie from 'dexie'
import { expect } from 'vitest'

export async function givenLegacyNotebook(databaseName: string) {
  const database = new Dexie(databaseName)
  database.version(15).stores({
    clubs: 'id',
    trainers: 'id',
    members: 'id, [firstName+lastName+dateOfBirth]',
    membershipPayments: 'id, memberId, [memberId+coveredMonth], coveredMonth',
    attendanceLists: 'id, &start, *memberIds',
    camps: 'id',
    campParticipants: 'id, campId, [campId+personKey]',
    events: 'eventId, eventName, occurredAt'
  })

  const createdAt = new Date('2026-03-01T10:00:00Z')
  const money = (amountMinor: number) => ({ amountMinor, currency: 'PLN' })
  const savedRows: Record<string, Record<string, unknown>[]> = {
    clubs: [
      { id: 'club-1', name: 'Tiger Club', foundingDate: createdAt, createdAt }
    ],
    trainers: [{ id: 'trainer-1', name: 'Jane Doe', createdAt }],
    members: [
      {
        id: 'member-1',
        firstName: 'jan',
        lastName: 'kowalski',
        phoneNumber: '+48123456789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
        joinedAt: createdAt,
        archived: true,
        archivedAt: createdAt,
        createdAt
      }
    ],
    membershipPayments: [
      {
        id: 'payment-1',
        memberId: 'member-1',
        coveredMonth: '2026-03',
        chargedAmount: money(160_00),
        createdAt
      }
    ],
    attendanceLists: [
      {
        id: 'attendance-1',
        memberIds: ['member-1'],
        start: createdAt,
        createdAt
      }
    ],
    camps: [
      {
        id: 'camp-1',
        name: 'Summer camp',
        note: 'Keep this note',
        startDate: new Date('2026-07-01T00:00:00Z'),
        finishDate: new Date('2026-07-08T00:00:00Z'),
        price: money(1200_00),
        createdAt,
        updatedAt: createdAt
      }
    ],
    campParticipants: [
      {
        id: 'participant-1',
        campId: 'camp-1',
        personKey: 'club:member-1',
        person: { type: 'club', memberId: 'member-1' },
        status: 'REGISTERED',
        totalAmountDue: money(1100_00),
        discounts: [
          {
            id: 'discount-1',
            amount: money(100_00),
            reason: 'Sibling',
            createdAt
          }
        ],
        financialTransactions: [
          {
            type: 'payment',
            id: 'camp-payment-1',
            amount: money(500_00),
            note: 'Deposit',
            createdAt
          },
          {
            type: 'non_refundable_deposit',
            id: 'deposit-1',
            amount: money(100_00),
            note: '',
            createdAt
          },
          {
            type: 'non_refundable_deposit_reversal',
            id: 'reversal-1',
            reversedTransactionId: 'deposit-1',
            amount: money(100_00),
            note: '',
            createdAt
          },
          {
            type: 'refund',
            id: 'refund-1',
            amount: money(200_00),
            note: 'Partial refund',
            createdAt
          }
        ],
        addedAt: createdAt,
        updatedAt: createdAt
      }
    ]
  }

  await database.open()
  for (const [tableName, rows] of Object.entries(savedRows)) {
    await database.table(tableName).bulkAdd(rows)
  }
  await database.table('events').add({
    eventId: 'old-event-1',
    eventName: 'club.created',
    occurredAt: createdAt,
    payload: savedRows.clubs?.[0]
  })

  return { database, savedRows }
}

export async function expectNotebookRowsToMatch(
  database: Dexie,
  savedRows: Record<string, Record<string, unknown>[]>
) {
  expect(database.tables.map((table) => table.name).sort()).toEqual(
    Object.keys(savedRows).sort()
  )
  for (const [tableName, rows] of Object.entries(savedRows)) {
    expect(await database.table(tableName).toArray()).toEqual(rows)
  }
}
