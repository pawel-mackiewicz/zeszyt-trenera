import { describe, expect, it } from 'vitest'

import { db } from '@/db'

describe('db', () => {
  it('exposes a named Dexie instance with a reserved version', () => {
    expect(db.name).toBe('trainer-notebook')
    expect(db.verno).toBe(1)
    expect(db.tables).toHaveLength(0)
  })
})
