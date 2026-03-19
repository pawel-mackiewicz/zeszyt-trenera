import { describe, it, expect } from 'vitest'
import { Trainer } from '@/domain/model/trainer'

describe('Trainer Model', () => {
  it('should create a trainer with all required properties', () => {
    const id = 'trainer-1'
    const name = 'Jane Doe'
    const beforeCreation = new Date()

    // Passing the ID explicitly proves the aggregate follows the same boundary as Club and does not generate identifiers on its own.
    const event = Trainer.register(name, id)

    const afterCreation = new Date()

    expect(event.trainer.id).toBe(id)
    expect(event.trainer.name).toBe(name)

    expect(event.trainer.createdAt).toBeDefined()
    expect(event.trainer.createdAt).toBeInstanceOf(Date)
    expect(event.trainer.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(event.trainer.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )

    expect(event.trainer.toSnapshot()).toEqual({
      id,
      name,
      createdAt: event.trainer.createdAt
    })

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
  })

  it('restores an existing trainer from persisted state', () => {
    const trainer = Trainer.restore({
      id: 'trainer-1',
      name: 'Jane Doe',
      createdAt: new Date('2024-01-01T00:00:00Z')
    })

    expect(trainer).toBeInstanceOf(Trainer)
    expect(trainer).toMatchObject({
      id: 'trainer-1',
      name: 'Jane Doe',
      createdAt: new Date('2024-01-01T00:00:00Z')
    })
    expect(trainer.toSnapshot()).toEqual({
      id: 'trainer-1',
      name: 'Jane Doe',
      createdAt: new Date('2024-01-01T00:00:00Z')
    })
  })

  it('keeps createdAt immutable when callers mutate shared references', () => {
    const originalCreatedAt = new Date('2024-01-01T00:00:00Z')
    const trainer = Trainer.restore({
      id: 'trainer-1',
      name: 'Jane Doe',
      createdAt: originalCreatedAt
    })

    // Mutating caller-owned dates must not leak back into the aggregate because restore accepts persistence-owned objects.
    originalCreatedAt.setUTCFullYear(2030)
    expect(trainer.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'))

    // Snapshot and getter consumers need the same isolation so read access never becomes write access by reference.
    const exposedCreatedAt = trainer.createdAt
    const snapshot = trainer.toSnapshot()

    exposedCreatedAt.setUTCFullYear(2031)
    snapshot.createdAt.setUTCFullYear(2032)

    expect(trainer.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'))
    expect(trainer.toSnapshot().createdAt).toEqual(
      new Date('2024-01-01T00:00:00Z')
    )
  })
})
