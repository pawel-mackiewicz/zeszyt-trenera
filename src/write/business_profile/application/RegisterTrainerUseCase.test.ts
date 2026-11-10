import { describe, it, expect, vi, beforeEach } from 'vitest'

import { RegisterTrainerUseCase } from './RegisterTrainerUseCase'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import { FakeTrainerRepo } from '@/write/business_profile/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { RegisterTrainerCommand } from '@/write/business_profile/application/commands/RegisterTrainerCommand'
import {
  Trainer,
  TrainerAlreadyExistsError
} from '@/write/business_profile/domain/Trainer'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  public readonly generatedIds: string[] = []

  public generate(): string {
    const id = 'trainer-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterTrainerUseCase', () => {
  let uow: FakeUnitOfWork
  let trainerRepo: FakeTrainerRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterTrainerUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    trainerRepo = new FakeTrainerRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')
    useCase = new RegisterTrainerUseCase(uow, trainerRepo, idGenerator)
  })

  it('should register a new trainer via UoW, saving the trainer', async () => {
    const dto: RegisterTrainerCommand = {
      trainerName: 'Jane Doe'
    }

    await useCase.handle(dto)

    expect(uow.execute).toHaveBeenCalledTimes(1)

    expect(trainerRepo.savedTrainers).toHaveLength(1)
    const savedTrainer = trainerRepo.savedTrainers[0]
    expect(savedTrainer.name).toBe('Jane Doe')
    // The fixed ID proves the workflow consumes the injected generator instead of letting the aggregate create infrastructure data itself.
    expect(savedTrainer.id).toBe('trainer-generated-by-test')
    expect(idGenerator.generatedIds).toEqual(['trainer-generated-by-test'])
  })

  it('should throw when trying to register a second trainer', async () => {
    trainerRepo.loadedTrainer = Trainer.restore({
      id: 'trainer-1',
      name: 'Existing Trainer',
      createdAt: new Date('2024-01-01T00:00:00Z')
    })

    const dto: RegisterTrainerCommand = {
      trainerName: 'Jane Doe'
    }

    await expect(useCase.handle(dto)).rejects.toThrow(TrainerAlreadyExistsError)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(trainerRepo.savedTrainers).toHaveLength(0)
  })
})
