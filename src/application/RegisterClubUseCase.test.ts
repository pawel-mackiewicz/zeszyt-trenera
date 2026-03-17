import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterClubUseCase } from './RegisterClubUseCase'
import { type RegisterClubCommand } from './requests/RegisterClubCommand'
import { Club } from '@/domain/model/club'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'

// Fake implementations
class FakeUnitOfWork implements UnitOfWork {
    async execute<T>(action: () => Promise<T>): Promise<T> {
        // In a real fake UoW, we'd start a transaction here. 
        // For testing, we just execute the action.
        return await action()
    }
}

class FakeClubRepo implements ClubRepoPort {
    public readonly savedClubs: Club[] = []

    save(club: Club): void {
        this.savedClubs.push(club)
    }
}

class FakeEventRepo implements EventRepoPort {
    public readonly savedEvents: any[] = []

    save(event: any): void {
        this.savedEvents.push(event)
    }
}

describe('RegisterClubUseCase', () => {
    let uow: FakeUnitOfWork
    let clubRepo: FakeClubRepo
    let eventRepo: FakeEventRepo
    let useCase: RegisterClubUseCase

    beforeEach(() => {
        /**
         * Creating sensible fakes/stubs for the required outgoing ports.
         * Fakes are good because they behave similarly to the real implementation (e.g., storing data in memory)
         * without using a mocking library deeply, making tests readable.
         */
        uow = new FakeUnitOfWork()
        clubRepo = new FakeClubRepo()
        eventRepo = new FakeEventRepo()

        // Spy on UoW to assert it was called
        vi.spyOn(uow, 'execute')

        useCase = new RegisterClubUseCase(uow, clubRepo, eventRepo)
    })

    it('should register a new club via UoW, saving the club and the related domain event', async () => {
        // Arrange
        const dto: RegisterClubCommand = {
            clubName: 'ZKS Włókniarz Częstochowa',
            foundingDate: new Date('1946-01-01T00:00:00Z')
        }

        // Act
        // We await the handle so we can assert on post-execution state
        await useCase.handle(dto)

        // Assert
        expect(uow.execute).toHaveBeenCalledTimes(1)

        // Verify Club was saved correctly
        expect(clubRepo.savedClubs).toHaveLength(1)
        const savedClub = clubRepo.savedClubs[0]
        expect(savedClub.name).toBe('ZKS Włókniarz Częstochowa')
        expect(savedClub.foundingDate).toEqual(new Date('1946-01-01T00:00:00Z'))
        expect(savedClub.id).toBeDefined()

        // Verify Domain Event was saved correctly
        expect(eventRepo.savedEvents).toHaveLength(1)
        const savedEvent = eventRepo.savedEvents[0]
        expect(savedEvent.eventName).toBe('club.created')
        expect(savedEvent.club).toBe(savedClub)
    })
})
