import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CampParticipantCampMismatchForRefundRegistrationError,
  CampParticipantNotFoundForRefundRegistrationError,
  RegisterCampParticipantRefundUseCase
} from '@/write/camps/application/RegisterCampParticipantRefundUseCase'
import { FakeCampParticipantRepo } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantRefundCommand } from '@/write/camps/application/requests/RegisterCampParticipantRefundCommand'
import {
  CampParticipant,
  CampParticipantCurrencyMismatchError,
  CampParticipantRefundExceedsRefundableBalanceError,
  CampParticipantRefundNotAllowedError,
  CampParticipantRefundRegisteredDomainEvent
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
  amountMinor = 500_00
): CampParticipant => {
  const [paidParticipant] = participant.registerPayment({
    id: `payment-${amountMinor}`,
    amount: Money.create({
      amountMinor,
      currency: 'PLN'
    }),
    note: 'Payment'
  })

  return paidParticipant
}

const givenParticipantResigned = (
  participant: CampParticipant
): CampParticipant => {
  const [resignedParticipant] = participant.resign()

  return resignedParticipant
}

const givenParticipantRefunded = (
  participant: CampParticipant
): CampParticipant => {
  const [refundedParticipant] = participant.registerRefund({
    id: 'refund-1',
    amount: Money.create({
      amountMinor: participant.financialBalance().amountMinor,
      currency: 'PLN'
    }),
    note: 'Refund'
  })

  return refundedParticipant
}

const refundCommand = (
  overrides: Partial<RegisterCampParticipantRefundCommand> = {}
): RegisterCampParticipantRefundCommand => ({
  campId: 'camp-1',
  participantId: 'participant-1',
  amount: {
    amountMinor: 200_00,
    currency: 'PLN'
  },
  note: ' Cash refund ',
  ...overrides
})

describe('RegisterCampParticipantRefundUseCase', () => {
  let uow: FakeUnitOfWork
  let campParticipantRepo: FakeCampParticipantRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterCampParticipantRefundUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campParticipantRepo = new FakeCampParticipantRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterCampParticipantRefundUseCase(
      uow,
      campParticipantRepo,
      eventRepo,
      idGenerator
    )
  })

  it('registers a participant refund via UoW, updating the participant and saving the event', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp())
    )

    await useCase.handle(refundCommand())

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
        type: 'payment'
      },
      {
        type: 'refund',
        id: 'generated-id-1',
        note: 'Cash refund'
      }
    ])
    expect(
      updatedParticipant.financialTransactions[1].amount.toSnapshot()
    ).toEqual({
      amountMinor: 200_00,
      currency: 'PLN'
    })
    expect(idGenerator.generatedIds).toEqual(['generated-id-1'])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent).toBeInstanceOf(
      CampParticipantRefundRegisteredDomainEvent
    )
    expect(savedEvent.eventName).toBe('camp.participant.refund_registered')
    expect(
      (savedEvent as CampParticipantRefundRegisteredDomainEvent).payload
    ).toEqual(updatedParticipant.toSnapshot())
  })

  it('marks a fully paid active participant as registered when the refund leaves money still due', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp(), 1000_00)
    )

    await useCase.handle(refundCommand())

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('REGISTERED')
    expect(updatedParticipant.remainingAmountToPay().toSnapshot()).toEqual({
      amountMinor: 200_00,
      currency: 'PLN'
    })
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('closes a resigned participant story as refunded when the refundable balance reaches zero', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantResigned(
        givenParticipantPaid(givenParticipantRegisteredForCamp(), 1000_00)
      )
    )

    await useCase.handle(
      refundCommand({
        amount: {
          amountMinor: 1000_00,
          currency: 'PLN'
        }
      })
    )

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('REFUNDED')
    expect(updatedParticipant.financialBalance().toSnapshot()).toEqual({
      amountMinor: 0,
      currency: 'PLN'
    })
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('rejects refund registration when the participant cannot be found', async () => {
    await expect(
      useCase.handle(
        refundCommand({
          participantId: 'missing-participant'
        })
      )
    ).rejects.toThrow(CampParticipantNotFoundForRefundRegistrationError)

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('rejects refund registration when the participant belongs to a different camp', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp('camp-2'))
    )

    await expect(useCase.handle(refundCommand())).rejects.toThrow(
      CampParticipantCampMismatchForRefundRegistrationError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })

  it('propagates invalid money input without saving', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp())
    )

    await expect(
      useCase.handle(
        refundCommand({
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

  it('propagates refund currency mismatches without saving', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp())
    )

    await expect(
      useCase.handle(
        refundCommand({
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

  it('does not save partial changes when the refund exceeds the refundable balance', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantPaid(givenParticipantRegisteredForCamp(), 100_00)
    )

    await expect(useCase.handle(refundCommand())).rejects.toThrow(
      CampParticipantRefundExceedsRefundableBalanceError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('does not save partial changes when the participant has already been refunded', async () => {
    campParticipantRepo.addParticipant(
      givenParticipantRefunded(
        givenParticipantResigned(
          givenParticipantPaid(givenParticipantRegisteredForCamp(), 1000_00)
        )
      )
    )

    await expect(
      useCase.handle(
        refundCommand({
          amount: {
            amountMinor: 1_00,
            currency: 'PLN'
          }
        })
      )
    ).rejects.toThrow(CampParticipantRefundNotAllowedError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })
})
