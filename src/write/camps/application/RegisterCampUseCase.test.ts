import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeCampRepo } from '@/write/camps/application/ports/CampRepoPort'
import type { RegisterCampCommand } from '@/write/camps/application/requests/RegisterCampCommand'
import { RegisterCampUseCase } from '@/write/camps/application/RegisterCampUseCase'
import {
  CampRegisteredDomainEvent,
  InvalidCampNameError,
  InvalidCampStartDateError
} from '@/write/camps/domain/Camp'
import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import { InvalidMoneyAmountMinorError } from '@/write/shared/vo/Money'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  public readonly generatedIds: string[] = []

  generate(): string {
    const id = 'camp-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

const futureDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000)
const futureFinishDate = (startDate: Date) =>
  new Date(startDate.getTime() + 24 * 60 * 60 * 1000)

describe('RegisterCampUseCase', () => {
  let uow: FakeUnitOfWork
  let campRepo: FakeCampRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterCampUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campRepo = new FakeCampRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterCampUseCase(uow, campRepo, eventRepo, idGenerator)
  })

  it('registers a camp via UoW, saving the camp and related domain event', async () => {
    const startDate = futureDate()
    const dto: RegisterCampCommand = {
      name: ' Summer camp ',
      note: '  Advanced group  ',
      startDate,
      finishDate: futureFinishDate(startDate),
      price: {
        amountMinor: 1299_00,
        currency: 'PLN'
      }
    }

    await useCase.handle(dto)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toEqual(['camp-generated-by-test'])

    expect(campRepo.savedCamps).toHaveLength(1)
    const savedCamp = campRepo.savedCamps[0]
    expect(savedCamp.id).toBe('camp-generated-by-test')
    expect(savedCamp.name).toBe('Summer camp')
    expect(savedCamp.note).toBe('Advanced group')
    expect(savedCamp.startDate).toEqual(dto.startDate)
    expect(savedCamp.finishDate).toEqual(dto.finishDate)
    expect(savedCamp.price.toSnapshot()).toEqual({
      amountMinor: 1299_00,
      currency: 'PLN'
    })

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('camp.registered')
    expect(savedEvent).toBeInstanceOf(CampRegisteredDomainEvent)
    expect((savedEvent as CampRegisteredDomainEvent).payload).toEqual(
      savedCamp.toSnapshot()
    )
  })

  it('rejects an empty camp name without saving', async () => {
    const startDate = futureDate()

    await expect(
      useCase.handle({
        name: '   ',
        startDate,
        finishDate: futureFinishDate(startDate),
        price: {
          amountMinor: 1299_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(InvalidCampNameError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toEqual(['camp-generated-by-test'])
    expect(campRepo.savedCamps).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('rejects a past start date without saving', async () => {
    await expect(
      useCase.handle({
        name: 'Summer camp',
        startDate: new Date('2020-01-01T00:00:00Z'),
        finishDate: futureDate(),
        price: {
          amountMinor: 1299_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(InvalidCampStartDateError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toEqual(['camp-generated-by-test'])
    expect(campRepo.savedCamps).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('rejects an invalid money amount before generating an id', async () => {
    const startDate = futureDate()

    await expect(
      useCase.handle({
        name: 'Summer camp',
        startDate,
        finishDate: futureFinishDate(startDate),
        price: {
          amountMinor: -1,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(InvalidMoneyAmountMinorError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(campRepo.savedCamps).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})
