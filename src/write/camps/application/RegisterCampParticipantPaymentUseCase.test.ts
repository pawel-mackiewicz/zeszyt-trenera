import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CampParticipantCampMismatchForPaymentRegistrationError,
  CampParticipantNotFoundForPaymentRegistrationError,
  RegisterCampParticipantPaymentUseCase
} from '@/write/camps/application/RegisterCampParticipantPaymentUseCase'
import { FakeCampParticipantRepo } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantPaymentCommand } from '@/write/camps/application/requests/RegisterCampParticipantPaymentCommand'
import {
  CampParticipant,
  CampParticipantCurrencyMismatchError,
  CampParticipantPaymentExceedsRemainingAmountError,
  CampParticipantPaymentNotAllowedError,
  CampParticipantPaymentRegisteredDomainEvent
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

const givenParticipantResigned = (
  participant: CampParticipant
): CampParticipant => {
  const [resignedParticipant] = participant.resign()

  return resignedParticipant
}

const paymentCommand = (
  overrides: Partial<RegisterCampParticipantPaymentCommand> = {}
): RegisterCampParticipantPaymentCommand => ({
  campId: 'camp-1',
  participantId: 'participant-1',
  amount: {
    amountMinor: 300_00,
    currency: 'PLN'
  },
  note: ' Cash ',
  ...overrides
})

describe('RegisterCampParticipantPaymentUseCase', () => {
  let uow: FakeUnitOfWork
  let campParticipantRepo: FakeCampParticipantRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterCampParticipantPaymentUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campParticipantRepo = new FakeCampParticipantRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterCampParticipantPaymentUseCase(
      uow,
      campParticipantRepo,
      eventRepo,
      idGenerator
    )
  })

  it('registers a participant payment via UoW, updating the participant and saving the event', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await useCase.handle(paymentCommand())

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toHaveLength(1)
    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.id).toBe('participant-1')
    expect(updatedParticipant.campId).toBe('camp-1')
    expect(updatedParticipant.status).toBe('REGISTERED')
    expect(updatedParticipant.remainingAmountToPay().toSnapshot()).toEqual({
      amountMinor: 700_00,
      currency: 'PLN'
    })
    expect(updatedParticipant.financialTransactions).toMatchObject([
      {
        type: 'payment',
        id: 'generated-id-1',
        note: 'Cash'
      }
    ])
    expect(
      updatedParticipant.financialTransactions[0].amount.toSnapshot()
    ).toEqual({
      amountMinor: 300_00,
      currency: 'PLN'
    })
    expect(idGenerator.generatedIds).toEqual(['generated-id-1'])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent).toBeInstanceOf(
      CampParticipantPaymentRegisteredDomainEvent
    )
    expect(savedEvent.eventName).toBe('camp.participant.payment_registered')
    expect(
      (savedEvent as CampParticipantPaymentRegisteredDomainEvent).payload
    ).toEqual(updatedParticipant.toSnapshot())
  })

  it('marks the participant as fully paid when the payment covers the amount due', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await useCase.handle(
      paymentCommand({
        amount: {
          amountMinor: 1000_00,
          currency: 'PLN'
        }
      })
    )

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('FULLY_PAID')
    expect(updatedParticipant.remainingAmountToPay().toSnapshot()).toEqual({
      amountMinor: 0,
      currency: 'PLN'
    })
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('does not save partial changes when the payment is higher than the amount still due', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await expect(
      useCase.handle(
        paymentCommand({
          amount: {
            amountMinor: 1000_01,
            currency: 'PLN'
          }
        })
      )
    ).rejects.toThrow(CampParticipantPaymentExceedsRemainingAmountError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('rejects payment registration when the participant cannot be found', async () => {
    await expect(
      useCase.handle(
        paymentCommand({
          participantId: 'missing-participant'
        })
      )
    ).rejects.toThrow(CampParticipantNotFoundForPaymentRegistrationError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('rejects payment registration when the participant belongs to a different camp', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantRegisteredForCamp('camp-2')
    )

    await expect(useCase.handle(paymentCommand())).rejects.toThrow(
      CampParticipantCampMismatchForPaymentRegistrationError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('propagates invalid money input without saving', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await expect(
      useCase.handle(
        paymentCommand({
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

  it('propagates payment currency mismatches without saving', async () => {
    campParticipantRepo.addParticipant(givenParticipantRegisteredForCamp())

    await expect(
      useCase.handle(
        paymentCommand({
          amount: {
            amountMinor: 300_00,
            currency: 'EUR'
          }
        })
      )
    ).rejects.toThrow(CampParticipantCurrencyMismatchError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('does not save partial changes when the domain rejects the payment', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantResigned(givenParticipantRegisteredForCamp())
    )

    await expect(useCase.handle(paymentCommand())).rejects.toThrow(
      CampParticipantPaymentNotAllowedError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })
})
