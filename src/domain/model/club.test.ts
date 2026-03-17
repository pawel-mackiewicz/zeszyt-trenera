import { describe, it, expect } from 'vitest'
import { Club } from '@/domain/model/club'

describe('Club Model', () => {
  it('should create a club with all required properties', () => {
    const name = 'Test Club'
    const foundingDate = new Date('2023-01-01')
    const beforeCreation = new Date()

    const event = Club.register(name, foundingDate)

    const afterCreation = new Date()

    expect(event.club.id).toBeDefined()

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
})
