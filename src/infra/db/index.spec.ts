import { describe, expect, it } from 'vitest'

import { db } from '@/infra/db'

describe('db', () => {
  it('exposes a named Dexie instance with club, trainer, member, and event table schemas', () => {
    expect(db.name).toBe('trainer-notebook')
    expect(db.verno).toBe(4)
    expect(db.tables).toHaveLength(4)
    expect(db.tables[0]?.name).toBe('clubs')
    expect(db.tables[0]?.schema.primKey.name).toBe('id')
    expect(db.tables[0]?.schema.indexes.map((index) => index.name)).toEqual([
      '_name'
    ])
    expect(db.tables[1]?.name).toBe('events')
    expect(db.tables[1]?.schema.primKey.name).toBe('eventId')
    expect(db.tables[1]?.schema.indexes.map((index) => index.name)).toEqual([
      'eventName',
      'occurredAt'
    ])
    expect(db.tables[2]?.name).toBe('trainers')
    expect(db.tables[2]?.schema.primKey.name).toBe('id')
    expect(db.tables[2]?.schema.indexes.map((index) => index.name)).toEqual([
      'name'
    ])
    expect(db.tables[3]?.name).toBe('members')
    expect(db.tables[3]?.schema.primKey.name).toBe('id')
    expect(db.tables[3]?.schema.indexes.map((index) => index.name)).toEqual([
      '[firstName+lastName+phoneNumber]'
    ])
  })
})
