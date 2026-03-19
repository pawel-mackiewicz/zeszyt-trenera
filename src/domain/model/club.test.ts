import { describe, it, expect } from 'vitest'
import { Club } from '@/domain/model/club'

describe('Club Model', () => {
  it('should create a club with all required properties', () => {
    const id = 'club-1'
    const name = 'Test Club'
    const foundingDate = new Date('2023-01-01')
    const beforeCreation = new Date()

    // Passing the ID explicitly proves the aggregate no longer reaches for an external ID generator by itself.
    const event = Club.register(name, foundingDate, id)

    const afterCreation = new Date()

    expect(event.club.id).toBe(id)

    expect(event.club.name).toBe(name)
    expect(event.club.foundingDate).toEqual(foundingDate)

    expect(event.club.createdAt).toBeDefined()
    expect(event.club.createdAt).toBeInstanceOf(Date)
    expect(event.club.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(event.club.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
  })

  it('restores an existing club from persisted state', () => {
    const club = Club.restore({
      id: 'club-1',
      name: 'Test Club',
      foundingDate: new Date('2023-01-01T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z')
    })

    expect(club).toBeInstanceOf(Club)
    expect(club).toMatchObject({
      id: 'club-1',
      name: 'Test Club',
      foundingDate: new Date('2023-01-01T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z')
    })
  })

  it('keeps foundingDate and createdAt immutable when callers mutate shared references', () => {
    const foundingDate = new Date('2023-01-01T00:00:00Z')
    const createdAt = new Date('2024-01-01T00:00:00Z')
    const club = Club.restore({
      id: 'club-1',
      name: 'Test Club',
      foundingDate,
      createdAt
    })

    // Mutating persistence-owned dates after restore must not rewrite aggregate state through shared objects.
    foundingDate.setUTCFullYear(2030)
    createdAt.setUTCFullYear(2031)

    expect(club.foundingDate).toEqual(new Date('2023-01-01T00:00:00Z'))
    expect(club.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'))

    // Getter and snapshot consumers also receive copies so the aggregate keeps exclusive ownership of its timeline.
    const exposedFoundingDate = club.foundingDate
    const exposedCreatedAt = club.createdAt
    const snapshot = club.toSnapshot()

    exposedFoundingDate.setUTCFullYear(2032)
    exposedCreatedAt.setUTCFullYear(2033)
    snapshot.foundingDate.setUTCFullYear(2034)
    snapshot.createdAt.setUTCFullYear(2035)

    expect(club.foundingDate).toEqual(new Date('2023-01-01T00:00:00Z'))
    expect(club.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'))
  })
})
