import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Club } from '@/domain/model/club'
import { MembershipPayment } from '@/domain/model/MembershipPayment'
import { Member } from '@/domain/model/member'
import { Trainer } from '@/domain/model/trainer'
import { TrainerNotebookDb } from '@/infra/db'
import {
  clearIndexedDb,
  inspectIndexedDb
} from '@/ui/composables/useIndexedDbInspector'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('inspectIndexedDb', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('indexeddb-inspector'))
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('captures schema metadata and rows for every declared Dexie table', async () => {
    const event = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await database.open()
    await database.clubs.add({
      id: event.club.id,
      name: event.club.name,
      foundingDate: event.club.foundingDate,
      createdAt: event.club.createdAt
    })
    await database.events.add({
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: {
        club: {
          id: event.club.id,
          name: event.club.name,
          foundingDate: event.club.foundingDate,
          createdAt: event.club.createdAt
        }
      }
    })

    const snapshot = await inspectIndexedDb(database)
    const clubsTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'clubs'
    )
    const eventsTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'events'
    )
    const trainersTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'trainers'
    )
    const membersTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'members'
    )
    const membershipPaymentsTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'membershipPayments'
    )

    expect(snapshot.databaseName).toBe(database.name)
    expect(snapshot.schemaVersion).toBe(7)
    expect(snapshot.tableSnapshots).toHaveLength(5)
    expect(clubsTable).toMatchObject({
      primaryKey: 'id',
      // The inspector should reflect that club writes no longer maintain an unused secondary index on local devices.
      indexes: [],
      rowCount: 1,
      columns: ['id', 'name', 'foundingDate', 'createdAt']
    })
    expect(clubsTable?.rows[0]).toMatchObject({
      id: event.club.id,
      name: event.club.name,
      foundingDate: event.club.foundingDate,
      createdAt: event.club.createdAt
    })
    expect(eventsTable).toMatchObject({
      primaryKey: 'eventId',
      indexes: ['eventName', 'occurredAt'],
      rowCount: 1,
      columns: ['eventId', 'eventName', 'occurredAt', 'payload']
    })
    expect(eventsTable?.rows[0]).toMatchObject({
      eventId: event.eventId,
      eventName: 'club.created',
      occurredAt: event.occurredAt,
      payload: {
        club: {
          id: event.club.id,
          name: event.club.name,
          foundingDate: event.club.foundingDate,
          createdAt: event.club.createdAt
        }
      }
    })
    expect(trainersTable).toMatchObject({
      primaryKey: 'id',
      indexes: [],
      rowCount: 0,
      columns: []
    })
    expect(membersTable).toMatchObject({
      primaryKey: 'id',
      indexes: ['[firstName+lastName+phoneNumber]'],
      rowCount: 0,
      columns: []
    })
    expect(membershipPaymentsTable).toMatchObject({
      primaryKey: 'id',
      indexes: ['[memberId+coveredMonth]'],
      rowCount: 0,
      columns: []
    })
  })

  it('clears rows from every store without removing the declared schema', async () => {
    const event = Club.register(
      'Skra Częstochowa',
      new Date('1926-01-01T00:00:00Z'),
      'club-2'
    )
    const trainerEvent = Trainer.register('Jane Doe', 'trainer-1')
    const memberEvent = Member.register(
      {
        firstName: 'Jan',
        lastName: 'Kowalski',
        phoneNumber: '+48111222333'
      },
      'member-1'
    )
    const membershipPaymentEvent = MembershipPayment.record(
      {
        memberId: memberEvent.member.id,
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await database.open()
    await database.clubs.add({
      id: event.club.id,
      name: event.club.name,
      foundingDate: event.club.foundingDate,
      createdAt: event.club.createdAt
    })
    await database.trainers.add({
      id: trainerEvent.trainer.id,
      name: trainerEvent.trainer.name,
      createdAt: trainerEvent.trainer.createdAt
    })
    await database.members.add({
      id: memberEvent.member.id,
      firstName: memberEvent.member.firstName,
      lastName: memberEvent.member.lastName,
      phoneNumber: memberEvent.member.phoneNumber,
      createdAt: memberEvent.member.createdAt
    })
    await database.membershipPayments.add({
      id: membershipPaymentEvent.payment.id,
      memberId: membershipPaymentEvent.payment.memberId,
      coveredMonth: membershipPaymentEvent.payment.coveredMonth,
      createdAt: membershipPaymentEvent.payment.createdAt
    })
    await database.events.add({
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: {
        club: {
          id: event.club.id,
          name: event.club.name
        }
      }
    })

    await clearIndexedDb(database)

    const snapshot = await inspectIndexedDb(database)

    // The debug route still needs table metadata after a reset, so the clear action must only remove rows.
    expect(snapshot.tableSnapshots).toMatchObject([
      { name: 'clubs', rowCount: 0 },
      { name: 'events', rowCount: 0 },
      { name: 'trainers', rowCount: 0 },
      { name: 'members', rowCount: 0 },
      { name: 'membershipPayments', rowCount: 0 }
    ])
    expect(snapshot.tableSnapshots.map((table) => table.name)).toEqual([
      'clubs',
      'events',
      'trainers',
      'members',
      'membershipPayments'
    ])
  })
})
