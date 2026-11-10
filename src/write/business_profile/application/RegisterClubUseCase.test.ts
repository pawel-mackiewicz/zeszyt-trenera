import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterClubUseCase } from './RegisterClubUseCase'
import { type RegisterClubCommand } from './commands/RegisterClubCommand'
import {
  Club,
  ClubAlreadyExistsError
} from '@/write/business_profile/domain/Club'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import { FakeClubRepo } from '@/write/business_profile/application/ports/ClubRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'

// Fake implementations
class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
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
  let idGenerator: FakeIdGenerator
  let useCase: RegisterClubUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    clubRepo = new FakeClubRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')
    useCase = new RegisterClubUseCase(uow, clubRepo, idGenerator)
  })

  it('should register a new club via UoW, saving the club', async () => {
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
  })
})
