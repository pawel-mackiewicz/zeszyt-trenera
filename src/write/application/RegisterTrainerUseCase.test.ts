import { describe, it, expect, vi, beforeEach } from 'vitest'

import { RegisterTrainerUseCase } from './RegisterTrainerUseCase'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/write/application/ports/IdGeneratorPort'
import type { TrainerRepoPort } from '@/write/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { RegisterTrainerCommand } from '@/write/application/requests/RegisterTrainerCommand'
import type { DomainEvent } from '@/write/domain/events/DomainEvent'
import {
  Trainer,
  TrainerAlreadyExistsError,
  TrainerCreatedDomainEvent
} from '@/write/domain/model/Trainer'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeTrainerRepo implements TrainerRepoPort {
  public readonly savedTrainers: Trainer[] = []
  public loadedTrainer: Trainer | undefined

  async save(trainer: Trainer): Promise<void> {
    this.savedTrainers.push(trainer)
  }

  async exists(): Promise<boolean> {
    return this.loadedTrainer != null
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
    const id = 'trainer-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterTrainerUseCase', () => {
  let uow: FakeUnitOfWork
  let trainerRepo: FakeTrainerRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterTrainerUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    trainerRepo = new FakeTrainerRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterTrainerUseCase(
      uow,
      trainerRepo,
      eventRepo,
      idGenerator
    )
  })

  it('should register a new trainer via UoW, saving the trainer and the related domain event', async () => {
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

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('trainer.created')
    // The assertion narrows to the concrete event type so the test documents that the event log stores a snapshot payload, not the mutable aggregate instance itself.
    expect(savedEvent).toBeInstanceOf(TrainerCreatedDomainEvent)
    expect((savedEvent as TrainerCreatedDomainEvent).payload).toEqual(
      savedTrainer.toSnapshot()
    )
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
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})
