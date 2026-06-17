import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CampParticipantCampMismatchForDiscountRegistrationError,
  CampParticipantNotFoundForDiscountRegistrationError,
  RegisterCampParticipantDiscountUseCase
} from '@/write/camps/application/RegisterCampParticipantDiscountUseCase'
import { FakeCampParticipantRepo } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantDiscountCommand } from '@/write/camps/application/requests/RegisterCampParticipantDiscountCommand'
import {
  CampParticipant,
  CampParticipantCurrencyMismatchError,
  CampParticipantDiscountAppliedDomainEvent,
  CampParticipantDiscountExceedsAmountDueError,
  CampParticipantDiscountNotAllowedError
} from '@/write/camps/domain/CampParticipant'
import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import { InvalidMoneyAmountMinorError, Money } from '@/write/shared/vo/Money'

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

const givenParticipantRegisteredForCamp = (
  campId = 'camp-1'
): CampParticipant => {
  const [participant] = CampParticipant.register(
    {
      campId,
      person: {
        type: 'external',
        firstName: 'Jane',
        lastName: 'Doe'
      },
      totalAmountDue: Money.create({
        amountMinor: 1000_00,
        currency: 'PLN'
      })
    },
    'participant-1'
  )

  return participant
}

const givenParticipantPaid = (
  participant: CampParticipant,
  amountMinor: number
): CampParticipant => {
  const [paidParticipant] = participant.registerPayment({
    id: 'payment-1',
    amount: Money.create({
      amountMinor,
      currency: 'PLN'
    }),
    note: 'advance'
  })

  return paidParticipant
}

const givenParticipantResigned = (
  participant: CampParticipant
): CampParticipant => {
  const [resignedParticipant] = participant.resign()

  return resignedParticipant
}

const discountCommand = (
  overrides: Partial<RegisterCampParticipantDiscountCommand> = {}
): RegisterCampParticipantDiscountCommand => ({
  campId: 'camp-1',
  participantId: 'participant-1',
  amount: {
    amountMinor: 200_00,
    currency: 'PLN'
  },
  reason: ' Sibling ',
  ...overrides
})

describe('RegisterCampParticipantDiscountUseCase', () => {
  let uow: FakeUnitOfWork
  let campParticipantRepo: FakeCampParticipantRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterCampParticipantDiscountUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campParticipantRepo = new FakeCampParticipantRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterCampParticipantDiscountUseCase(
      uow,
      campParticipantRepo,
      eventRepo,
      idGenerator
    )
  })

  it('registers a participant discount via UoW, updating the participant and saving the event', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await useCase.handle(discountCommand())

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toHaveLength(1)
    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.id).toBe('participant-1')
    expect(updatedParticipant.campId).toBe('camp-1')
    expect(updatedParticipant.status).toBe('REGISTERED')
    expect(updatedParticipant.totalAmountDue.toSnapshot()).toEqual({
      amountMinor: 800_00,
      currency: 'PLN'
    })
    expect(updatedParticipant.discounts).toMatchObject([
      {
        id: 'generated-id-1',
        reason: 'Sibling'
      }
    ])
    expect(updatedParticipant.discounts[0].amount.toSnapshot()).toEqual({
      amountMinor: 200_00,
      currency: 'PLN'
    })
    expect(idGenerator.generatedIds).toEqual(['generated-id-1'])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent).toBeInstanceOf(CampParticipantDiscountAppliedDomainEvent)
    expect(savedEvent.eventName).toBe('camp.participant.discount_applied')
    expect(
      (savedEvent as CampParticipantDiscountAppliedDomainEvent).payload
    ).toEqual(updatedParticipant.toSnapshot())
  })

  it('marks the participant as fully paid when a discount makes the paid balance cover the amount due', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp(), 800_00)
    )

    await useCase.handle(discountCommand())

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('FULLY_PAID')
    expect(updatedParticipant.remainingAmountToPay().toSnapshot()).toEqual({
      amountMinor: 0,
      currency: 'PLN'
    })
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('rejects discount registration when the participant cannot be found', async () => {
    await expect(
      useCase.handle(
        discountCommand({
          participantId: 'missing-participant'
        })
      )
    ).rejects.toThrow(CampParticipantNotFoundForDiscountRegistrationError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('rejects discount registration when the participant belongs to a different camp', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantRegisteredForCamp('camp-2')
    )

    await expect(useCase.handle(discountCommand())).rejects.toThrow(
      CampParticipantCampMismatchForDiscountRegistrationError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('propagates invalid money input without saving', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await expect(
      useCase.handle(
        discountCommand({
          amount: {
            amountMinor: -1,
            currency: 'PLN'
          }
        })
      )
    ).rejects.toThrow(InvalidMoneyAmountMinorError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('propagates discount currency mismatches without saving', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await expect(
      useCase.handle(
        discountCommand({
          amount: {
            amountMinor: 200_00,
            currency: 'EUR'
          }
        })
      )
    ).rejects.toThrow(CampParticipantCurrencyMismatchError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('propagates excessive discounts without saving', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await expect(
      useCase.handle(
        discountCommand({
          amount: {
            amountMinor: 1200_00,
            currency: 'PLN'
          }
        })
      )
    ).rejects.toThrow(CampParticipantDiscountExceedsAmountDueError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('does not save partial changes when the domain rejects the discount', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantResigned(givenParticipantRegisteredForCamp())
    )

    await expect(useCase.handle(discountCommand())).rejects.toThrow(
      CampParticipantDiscountNotAllowedError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })
})
