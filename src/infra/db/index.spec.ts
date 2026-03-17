import { describe, expect, it } from 'vitest'

import { db } from '@/infra/db'

describe('db', () => {
  it('exposes a named Dexie instance with a clubs table schema', () => {
    expect(db.name).toBe('trainer-notebook')
    expect(db.verno).toBe(1)
    expect(db.tables).toHaveLength(1)
    expect(db.tables[0]?.name).toBe('clubs')
    expect(db.tables[0]?.schema.primKey.name).toBe('id')
    expect(db.tables[0]?.schema.indexes.map((index) => index.name)).toEqual([
      '_name'
    ])
  })
})
