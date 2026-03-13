import { describe, it, expect } from 'vitest'
import { Club } from './club'

describe('Club Model', () => {
    it('should create a club with a random UUID', () => {
        const club = new Club('Test Club', new Date())

        expect(club.id).toBeDefined()
        expect(club.id).toHaveLength(36)
        expect(club.name).toBe('Test Club')
        expect(club.foundingDate).toBeDefined()
    })
})
