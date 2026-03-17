import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterClubUseCase } from './RegisterClubUseCase'
import { type RegisterClubCommand } from './requests/RegisterClubCommand'
import { Club } from '@/domain/model/club'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { DomainEvent } from '@/domain/events/DomainEvent'

// Fake implementations
class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeClubRepo implements ClubRepoPort {
  public readonly savedClubs: Club[] = []

  async save(club: Club): Promise<void> {
    this.savedClubs.push(club)
  }
}

class FakeEventRepo implements EventRepoPort {
  public readonly savedEvents: DomainEvent[] = []

  async save(event: DomainEvent): Promise<void> {
    this.savedEvents.push(event)
  }
}

describe('RegisterClubUseCase', () => {
  let uow: FakeUnitOfWork
  let clubRepo: FakeClubRepo
  let eventRepo: FakeEventRepo
  let useCase: RegisterClubUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    clubRepo = new FakeClubRepo()
    eventRepo = new FakeEventRepo()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterClubUseCase(uow, clubRepo, eventRepo)
  })

  it('should register a new club via UoW, saving the club and the related domain event', async () => {
    const dto: RegisterClubCommand = {
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    }

    await useCase.handle(dto)

    expect(uow.execute).toHaveBeenCalledTimes(1)

    expect(clubRepo.savedClubs).toHaveLength(1)
    const savedClub = clubRepo.savedClubs[0]
    expect(savedClub.name).toBe('ZKS Włókniarz Częstochowa')
    expect(savedClub.foundingDate).toEqual(new Date('1946-01-01T00:00:00Z'))
    expect(savedClub.id).toBeDefined()

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('club.created')
    expect(savedEvent).toMatchObject({ club: savedClub })
  })
})
