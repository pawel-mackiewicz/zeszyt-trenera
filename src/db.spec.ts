import { describe, expect, it } from 'vitest'

import { db } from '@/db'

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
    expect(db.verno).toBe(8)
    expect(db.tables).toHaveLength(6)
    expect(clubsTable?.schema.primKey.name).toBe('id')
    // Setup only needs primary-key access for club data right now, so the schema should stay free of unused secondary indexes.
    expect(clubsTable?.schema.indexes.map((index) => index.name)).toEqual([])
    expect(attendanceListsTable?.schema.primKey.name).toBe('id')
    expect(
      attendanceListsTable?.schema.indexes.map((index) => index.name)
    ).toEqual(['start'])
    expect(eventsTable?.schema.primKey.name).toBe('eventId')
    expect(eventsTable?.schema.indexes.map((index) => index.name)).toEqual([
      'eventName',
      'occurredAt'
    ])
    expect(trainersTable?.schema.primKey.name).toBe('id')
    expect(trainersTable?.schema.indexes.map((index) => index.name)).toEqual([])
    expect(membersTable?.schema.primKey.name).toBe('id')
    expect(membersTable?.schema.indexes.map((index) => index.name)).toEqual([
      '[firstName+lastName+phoneNumber]'
    ])
    expect(membershipPaymentsTable?.schema.primKey.name).toBe('id')
    expect(
      membershipPaymentsTable?.schema.indexes.map((index) => index.name)
    ).toEqual(['[memberId+coveredMonth]'])
  })
})
