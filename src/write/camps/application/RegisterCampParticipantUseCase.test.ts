import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeCampRepo } from '@/write/camps/application/ports/CampRepoPort'
import {
  createCampParticipantIdentityKey,
  FakeCampParticipantRepo
} from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantCommand } from '@/write/camps/application/requests/RegisterCampParticipantCommand'
import {
  CampNotFoundForParticipantRegistrationError,
  CampParticipantAlreadyRegisteredError,
  RegisterCampParticipantUseCase
} from '@/write/camps/application/RegisterCampParticipantUseCase'
import {
  CampParticipantCurrencyMismatchError,
  CampParticipantDiscountExceedsAmountDueError,
  CampParticipantRegisteredDomainEvent,
  InvalidCampParticipantCampIdError
} from '@/write/camps/domain/CampParticipant'
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

  public generate(): string {
    const id = `generated-id-${this.generatedIds.length + 1}`
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterCampParticipantUseCase', () => {
  let uow: FakeUnitOfWork
  let campRepo: FakeCampRepo
  let campParticipantRepo: FakeCampParticipantRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterCampParticipantUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campRepo = new FakeCampRepo()
    campParticipantRepo = new FakeCampParticipantRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()
    campRepo.existingCampIds.add('camp-1')

    vi.spyOn(uow, 'execute')

    useCase = new RegisterCampParticipantUseCase(
      uow,
      campRepo,
      campParticipantRepo,
      eventRepo,
      idGenerator
    )
  })

  it('registers a camp participant via UoW, saving the participant and domain event', async () => {
    const dto: RegisterCampParticipantCommand = {
      campId: ' camp-1 ',
      person: {
        type: 'external',
        firstName: ' jane ',
        lastName: ' doe '
      },
      totalAmountDue: {
        amountMinor: 1299_00,
        currency: 'PLN'
      }
    }

    await useCase.handle(dto)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.existsChecks).toEqual([
      {
        campId: 'camp-1',
        person: {
          type: 'external',
          firstName: 'jane',
          lastName: 'doe'
        }
      }
    ])
    expect(campParticipantRepo.savedParticipants).toHaveLength(1)
    const savedParticipant = campParticipantRepo.savedParticipants[0]
    expect(savedParticipant.campId).toBe('camp-1')
    expect(savedParticipant.person).toEqual({
      type: 'external',
      firstName: 'jane',
      lastName: 'doe'
    })
    expect(savedParticipant.totalAmountDue.toSnapshot()).toEqual({
      amountMinor: 1299_00,
      currency: 'PLN'
    })
    expect(savedParticipant.status).toBe('REGISTERED')

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent).toBeInstanceOf(CampParticipantRegisteredDomainEvent)
    expect(savedEvent.eventName).toBe('camp.participant.registered')
    expect(
      (savedEvent as CampParticipantRegisteredDomainEvent).payload
    ).toEqual(savedParticipant.toSnapshot())
  })

  it('applies an initial discount before an initial payment and saves all events in order', async () => {
    await useCase.handle({
      campId: 'camp-1',
      person: {
        type: 'club',
        memberId: ' member-1 '
      },
      totalAmountDue: {
        amountMinor: 1000_00,
        currency: 'PLN'
      },
      initialDiscount: {
        amount: {
          amountMinor: 200_00,
          currency: 'PLN'
        },
        reason: ' Sibling '
      },
      initialPayment: {
        amount: {
          amountMinor: 800_00,
          currency: 'PLN'
        },
        note: ' Cash '
      }
    })

    expect(campParticipantRepo.savedParticipants).toHaveLength(1)
    const savedParticipant = campParticipantRepo.savedParticipants[0]
    expect(savedParticipant.status).toBe('FULLY_PAID')
    expect(savedParticipant.totalAmountDue.toSnapshot()).toEqual({
      amountMinor: 800_00,
      currency: 'PLN'
    })
    expect(savedParticipant.discounts).toMatchObject([
      {
        id: 'generated-id-1',
        reason: 'Sibling'
      }
    ])
    expect(savedParticipant.discounts[0].amount.toSnapshot()).toEqual({
      amountMinor: 200_00,
      currency: 'PLN'
    })
    expect(savedParticipant.financialTransactions).toMatchObject([
      {
        type: 'payment',
        id: 'generated-id-2',
        note: 'Cash'
      }
    ])
    expect(
      savedParticipant.financialTransactions[0].amount.toSnapshot()
    ).toEqual({
      amountMinor: 800_00,
      currency: 'PLN'
    })
    expect(eventRepo.savedEvents.map((event) => event.eventName)).toEqual([
      'camp.participant.registered',
      'camp.participant.discount_applied',
      'camp.participant.payment_registered'
    ])
    expect(idGenerator.generatedIds).toEqual([
      'generated-id-1',
      'generated-id-2'
    ])
  })

  it('rejects a missing camp without saving the participant or events', async () => {
    await expect(
      useCase.handle({
        campId: 'missing-camp',
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: {
          amountMinor: 1000_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(CampNotFoundForParticipantRegistrationError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.savedParticipants).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
    expect(idGenerator.generatedIds).toHaveLength(0)
  })

  it('rejects a duplicate participant in the same camp without saving', async () => {
    campParticipantRepo.existingKeys.add(
      createCampParticipantIdentityKey('camp-1', {
        type: 'club',
        memberId: 'member-1'
      })
    )

    await expect(
      useCase.handle({
        campId: 'camp-1',
        person: {
          type: 'club',
          memberId: ' member-1 '
        },
        totalAmountDue: {
          amountMinor: 1000_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(CampParticipantAlreadyRegisteredError)

    expect(campParticipantRepo.savedParticipants).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
    expect(idGenerator.generatedIds).toHaveLength(0)
  })

  it('propagates invalid participant input without saving', async () => {
    await expect(
      useCase.handle({
        campId: '   ',
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: {
          amountMinor: 1000_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(InvalidCampParticipantCampIdError)

    expect(campParticipantRepo.savedParticipants).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('propagates invalid money input without saving', async () => {
    await expect(
      useCase.handle({
        campId: 'camp-1',
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: {
          amountMinor: -1,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(InvalidMoneyAmountMinorError)

    expect(campParticipantRepo.savedParticipants).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('propagates invalid initial discount input without saving', async () => {
    await expect(
      useCase.handle({
        campId: 'camp-1',
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: {
          amountMinor: 1000_00,
          currency: 'PLN'
        },
        initialDiscount: {
          amount: {
            amountMinor: 1200_00,
            currency: 'PLN'
          }
        }
      })
    ).rejects.toThrow(CampParticipantDiscountExceedsAmountDueError)

    expect(campParticipantRepo.savedParticipants).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('propagates initial payment currency mismatches without saving', async () => {
    await expect(
      useCase.handle({
        campId: 'camp-1',
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: {
          amountMinor: 1000_00,
          currency: 'PLN'
        },
        initialPayment: {
          amount: {
            amountMinor: 1000_00,
            currency: 'EUR'
          }
        }
      })
    ).rejects.toThrow(CampParticipantCurrencyMismatchError)

    expect(campParticipantRepo.savedParticipants).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})
