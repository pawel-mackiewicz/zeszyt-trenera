import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Club } from '@/write/domain/model/Club'
import { MembershipPayment } from '@/write/domain/model/MembershipPayment'
import { Trainer } from '@/write/domain/model/Trainer'
import { TrainerNotebookDb } from '@/db'
import {
  clearIndexedDb,
  clearIndexedDbTable,
  inspectIndexedDb,
  useIndexedDbInspector
} from '@/ui/composables/useIndexedDbInspector'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

const InspectorProbe = defineComponent({
  props: {
    database: {
      type: Object,
      required: true
    }
  },
  setup(props, { expose }) {
    const inspector = useIndexedDbInspector(props.database as TrainerNotebookDb)
    expose(inspector)
    return () => null
  }
})

function readErrorKind(wrapper: ReturnType<typeof mount>) {
  return (
    (
      wrapper.vm as unknown as {
        $: {
          exposed: {
            errorKind: {
              value: string | null
            }
          }
        }
      }
    ).$?.exposed.errorKind.value ?? null
  )
}

describe('inspectIndexedDb', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('indexeddb-inspector'))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    database.close()
    await database.delete()
  })

  it('captures schema metadata and rows for every declared Dexie table', async () => {
    const [club, event] = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await database.open()
    await database.clubs.add({
      id: club.id,
      name: club.name,
      foundingDate: club.foundingDate,
      createdAt: club.createdAt
    })
    await database.events.add({
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: event.payload
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
    const attendanceListsTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'attendanceLists'
    )

    expect(snapshot.databaseName).toBe(database.name)
    // What: pin the inspector to the current Dexie schema version. Why: the debug view should surface the exact schema revision the app is shipping, including the new member birth-date identity index.
    expect(snapshot.schemaVersion).toBe(11)
    expect(snapshot.tableSnapshots).toHaveLength(6)
    expect(clubsTable).toMatchObject({
      primaryKey: 'id',
      // The inspector should reflect that club writes no longer maintain an unused secondary index on local devices.
      indexes: [],
      rowCount: 1,
      columns: ['id', 'name', 'foundingDate', 'createdAt']
    })
    expect(clubsTable?.rows[0]).toMatchObject({
      id: club.id,
      name: club.name,
      foundingDate: club.foundingDate,
      createdAt: club.createdAt
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
      payload: event.payload
    })
    expect(trainersTable).toMatchObject({
      primaryKey: 'id',
      indexes: [],
      rowCount: 0,
      columns: []
    })
    expect(membersTable).toMatchObject({
      primaryKey: 'id',
      // The inspector should expose the current duplicate-identity index so support diagnostics match the shipped offline schema.
      indexes: ['[firstName+lastName+dateOfBirth]'],
      rowCount: 0,
      columns: []
    })
    expect(membershipPaymentsTable).toMatchObject({
      primaryKey: 'id',
      indexes: ['[memberId+coveredMonth]', 'coveredMonth'],
      rowCount: 0,
      columns: []
    })
    expect(attendanceListsTable).toMatchObject({
      primaryKey: 'id',
      // The debug snapshot must include the attendance store so resets stay trustworthy after the latest offline schema expansion.
      indexes: ['start'],
      rowCount: 0,
      columns: []
    })
  })

  it('clears rows from every store without removing the declared schema', async () => {
    const [club, event] = Club.register(
      'Skra Częstochowa',
      new Date('1926-01-01T00:00:00Z'),
      'club-2'
    )
    const [trainer] = Trainer.register('Jane Doe', 'trainer-1')
    const member = {
      id: 'member-1',
      firstName: 'jan',
      lastName: 'kowalski',
      phoneNumber: '+48111222333',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      createdAt: new Date('2026-03-01T00:00:00Z')
    }
    const [membershipPayment] = MembershipPayment.record(
      {
        memberId: member.id,
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await database.open()
    await database.clubs.add({
      id: club.id,
      name: club.name,
      foundingDate: club.foundingDate,
      createdAt: club.createdAt
    })
    await database.trainers.add({
      id: trainer.id,
      name: trainer.name,
      createdAt: trainer.createdAt
    })
    await database.members.add({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      dateOfBirth: member.dateOfBirth,
      createdAt: member.createdAt
    })
    await database.membershipPayments.add({
      id: membershipPayment.id,
      memberId: membershipPayment.memberId,
      coveredMonth: membershipPayment.coveredMonth,
      createdAt: membershipPayment.createdAt
    })
    await database.events.add({
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      // The debug inspector should reflect the same raw snapshot payload shape the app stores for offline event replay.
      payload: event.payload
    })

    await clearIndexedDb(database)

    const snapshot = await inspectIndexedDb(database)

    // The debug route still needs table metadata after a reset, so the clear action must only remove rows.
    expect(snapshot.tableSnapshots).toMatchObject([
      { name: 'clubs', rowCount: 0 },
      { name: 'events', rowCount: 0 },
      { name: 'trainers', rowCount: 0 },
      { name: 'members', rowCount: 0 },
      { name: 'membershipPayments', rowCount: 0 },
      // What: assert the newest store survives a clear. Why: the debug view depends on complete schema visibility right after local resets.
      { name: 'attendanceLists', rowCount: 0 }
    ])
    expect(snapshot.tableSnapshots.map((table) => table.name)).toEqual([
      'clubs',
      'events',
      'trainers',
      'members',
      'membershipPayments',
      'attendanceLists'
    ])
  })

  it('clears rows only from the selected store', async () => {
    await database.open()
    await database.clubs.add({
      id: 'club-1',
      name: 'Skra Częstochowa',
      foundingDate: new Date('1926-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-03-01T00:00:00.000Z')
    })
    await database.events.add({
      eventId: 'event-1',
      eventName: 'club.created',
      occurredAt: new Date('2026-03-01T00:00:00.000Z'),
      payload: { id: 'club-1' }
    })

    // What: guarantee table-level reset is surgical. Why: mobile offline debugging should not destroy unrelated data while investigating one flow.
    await clearIndexedDbTable(database, 'clubs')

    expect(await database.clubs.count()).toBe(0)
    expect(await database.events.count()).toBe(1)
  })

  it('reports an inspect error kind without leaking final copy', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    vi.spyOn(database, 'open').mockRejectedValue(new Error('boom'))

    const wrapper = mount(InspectorProbe, {
      props: {
        database
      }
    })

    await flushPromises()
    await vi.waitFor(() => {
      expect(readErrorKind(wrapper)).toBe('inspect')
    })

    expect(consoleError).toHaveBeenCalled()
  })
})
