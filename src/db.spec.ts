import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { db, TrainerNotebookDb } from '@/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('db', () => {
  it('exposes a named Dexie instance with club, trainer, member, membership payment, attendance list, and event table schemas', () => {
    const clubsTable = db.tables.find((table) => table.name === 'clubs')
    const attendanceListsTable = db.tables.find(
      (table) => table.name === 'attendanceLists'
    )
    const eventsTable = db.tables.find((table) => table.name === 'events')
    const trainersTable = db.tables.find((table) => table.name === 'trainers')
    const membersTable = db.tables.find((table) => table.name === 'members')
    const membershipPaymentsTable = db.tables.find(
      (table) => table.name === 'membershipPayments'
    )

    expect(db.name).toBe('trainer-notebook')
    expect(db.verno).toBe(12)
    expect(db.tables).toHaveLength(6)
    expect(clubsTable?.schema.primKey.name).toBe('id')
    // Setup only needs primary-key access for club data right now, so the schema should stay free of unused secondary indexes.
    expect(clubsTable?.schema.indexes.map((index) => index.name)).toEqual([])
    expect(attendanceListsTable?.schema.primKey.name).toBe('id')
    expect(
      attendanceListsTable?.schema.indexes.map((index) => index.name)
    ).toEqual(['start', 'memberIds'])
    expect(eventsTable?.schema.primKey.name).toBe('eventId')
    expect(eventsTable?.schema.indexes.map((index) => index.name)).toEqual([
      'eventName',
      'occurredAt'
    ])
    expect(trainersTable?.schema.primKey.name).toBe('id')
    expect(trainersTable?.schema.indexes.map((index) => index.name)).toEqual([])
    expect(membersTable?.schema.primKey.name).toBe('id')
    // Member registration now deduplicates on stable identity data, so the Dexie schema should expose the birth-date compound index instead of the old phone-based one.
    expect(membersTable?.schema.indexes.map((index) => index.name)).toEqual([
      '[firstName+lastName+dateOfBirth]'
    ])
    expect(membershipPaymentsTable?.schema.primKey.name).toBe('id')
    expect(
      membershipPaymentsTable?.schema.indexes.map((index) => index.name)
    ).toEqual(['memberId', '[memberId+coveredMonth]', 'coveredMonth'])
  })

  afterEach(async () => {
    db.close()
  })

  it('migrates legacy blank member phone values to a missing field', async () => {
    const databaseName = createTestDbName('db-member-phone-migration')
    const legacyDatabase = new Dexie(databaseName)

    legacyDatabase.version(9).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      members: 'id, [firstName+lastName+phoneNumber]',
      membershipPayments: 'id, [memberId+coveredMonth], coveredMonth',
      attendanceLists: 'id, &start'
    })

    await legacyDatabase.open()
    await legacyDatabase.table('members').add({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '',
      createdAt: new Date('2026-03-01T00:00:00Z')
    })
    legacyDatabase.close()

    const migratedDatabase = new TrainerNotebookDb(databaseName)

    try {
      await migratedDatabase.open()
      const migratedMember = await migratedDatabase.members.get('member-1')

      expect(migratedMember).toEqual({
        id: 'member-1',
        firstName: 'jane',
        lastName: 'doe',
        createdAt: new Date('2026-03-01T00:00:00Z')
      })
      expect(migratedMember && 'phoneNumber' in migratedMember).toBe(false)
    } finally {
      migratedDatabase.close()
      await migratedDatabase.delete()
      await legacyDatabase.delete()
    }
  })
})
