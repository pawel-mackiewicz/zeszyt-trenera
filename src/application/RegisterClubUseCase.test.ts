import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterClubUseCase } from './RegisterClubUseCase'
import { type RegisterClubCommand } from './requests/RegisterClubCommand'
import {
  Club,
  ClubAlreadyExistsError,
  ClubCreatedDomainEvent
} from '@/domain/model/Club'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'

// Fake implementations
class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeClubRepo implements ClubRepoPort {
  public readonly savedClubs: Club[] = []
  public loadedClub: Club | undefined

  async save(club: Club): Promise<void> {
    this.savedClubs.push(club)
  }

  async exists(): Promise<boolean> {
    return this.loadedClub != null
  }
}

class FakeEventRepo implements EventRepoPort {
  public readonly savedEvents: DomainEvent[] = []

  async save(event: DomainEvent): Promise<void> {
    this.savedEvents.push(event)
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  public readonly generatedIds: string[] = []

  public generate(): string {
    const id = 'club-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterClubUseCase', () => {
  let uow: FakeUnitOfWork
  let clubRepo: FakeClubRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterClubUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    clubRepo = new FakeClubRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterClubUseCase(uow, clubRepo, eventRepo, idGenerator)
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
    // The test fixes the generated ID so the workflow proves it consumes the injected generator instead of creating IDs internally.
    expect(savedClub.id).toBe('club-generated-by-test')
    expect(idGenerator.generatedIds).toEqual(['club-generated-by-test'])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('club.created')
    // The assertion narrows to the concrete event type so the test documents that the event log stores a snapshot payload, not the mutable aggregate instance itself.
    expect(savedEvent).toBeInstanceOf(ClubCreatedDomainEvent)
    expect((savedEvent as ClubCreatedDomainEvent).payload).toEqual(
      savedClub.toSnapshot()
    )
  })

  it('should throw when trying to register a second club', async () => {
    clubRepo.loadedClub = Club.restore({
      id: 'club-1',
      name: 'Existing Club',
      foundingDate: new Date('1946-01-01T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z')
    })

    const dto: RegisterClubCommand = {
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    }

    await expect(useCase.handle(dto)).rejects.toThrow(ClubAlreadyExistsError)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(clubRepo.savedClubs).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})
