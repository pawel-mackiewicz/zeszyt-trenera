import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AcceptCampParticipantResignationUseCase,
  CampParticipantCampMismatchForResignationAcceptanceError,
  CampParticipantNotFoundForResignationAcceptanceError
} from '@/write/camps/application/AcceptCampParticipantResignationUseCase'
import { FakeCampParticipantRepo } from '@/write/camps/application/ports/CampParticipantRepoPort'
import {
  CampParticipant,
  CampParticipantRefundRegisteredDomainEvent,
  CampParticipantResignedDomainEvent,
  CampParticipantResignationNotAllowedError
} from '@/write/camps/domain/CampParticipant'
import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import { Money } from '@/write/shared/vo/Money'

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
  amountMinor = 1000_00
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

describe('AcceptCampParticipantResignationUseCase', () => {
  let uow: FakeUnitOfWork
  let campParticipantRepo: FakeCampParticipantRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: AcceptCampParticipantResignationUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campParticipantRepo = new FakeCampParticipantRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new AcceptCampParticipantResignationUseCase(
      uow,
      campParticipantRepo,
      eventRepo,
      idGenerator
    )
  })

  it('accepts a registered participant resignation via UoW, updating the resigned participant and saving the event', async () => {
    const participant = givenParticipantRegisteredForCamp()
    campParticipantRepo.addParticipant(participant)

    await useCase.handle({
      campId: 'camp-1',
      participantId: 'participant-1'
    })

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toHaveLength(1)
    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.id).toBe('participant-1')
    expect(updatedParticipant.status).toBe('RESIGNED')
    expect(updatedParticipant.financialTransactions).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent).toBeInstanceOf(CampParticipantResignedDomainEvent)
    expect(savedEvent.eventName).toBe('camp.participant.resigned')
    expect((savedEvent as CampParticipantResignedDomainEvent).payload).toEqual(
      updatedParticipant.toSnapshot()
    )
  })

  it('accepts resignation with a non-refundable deposit kept from the paid balance', async () => {
    const participant = givenParticipantPaid(
      givenParticipantRegisteredForCamp()
    )
    campParticipantRepo.addParticipant(participant)

    await useCase.handle({
      campId: 'camp-1',
      participantId: 'participant-1',
      nonRefundableDepositValue: {
        amountMinor: 300_00,
        currency: 'PLN'
      }
    })

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('RESIGNED')
    expect(
      updatedParticipant.financialTransactions.map((transaction) => ({
        type: transaction.type,
        id: transaction.id,
        amount: transaction.amount.toSnapshot(),
        note: transaction.note
      }))
    ).toEqual([
      {
        type: 'payment',
        id: 'payment-1',
        amount: {
          amountMinor: 1000_00,
          currency: 'PLN'
        },
        note: 'advance'
      },
      {
        type: 'non_refundable_deposit',
        id: 'generated-id-1',
        amount: {
          amountMinor: 300_00,
          currency: 'PLN'
        },
        note: ''
      }
    ])
    expect(idGenerator.generatedIds).toEqual(['generated-id-1'])
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(
      CampParticipantResignedDomainEvent
    )
  })

  it('accepts resignation and then refunds the remaining refundable balance', async () => {
    const participant = givenParticipantPaid(
      givenParticipantRegisteredForCamp()
    )
    campParticipantRepo.addParticipant(participant)

    await useCase.handle({
      campId: 'camp-1',
      participantId: 'participant-1',
      nonRefundableDepositValue: {
        amountMinor: 300_00,
        currency: 'PLN'
      },
      refundedValue: {
        amountMinor: 700_00,
        currency: 'PLN'
      }
    })

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('REFUNDED')
    expect(
      updatedParticipant.financialTransactions.map((transaction) => ({
        type: transaction.type,
        id: transaction.id,
        amount: transaction.amount.toSnapshot(),
        note: transaction.note
      }))
    ).toEqual([
      {
        type: 'payment',
        id: 'payment-1',
        amount: {
          amountMinor: 1000_00,
          currency: 'PLN'
        },
        note: 'advance'
      },
      {
        type: 'non_refundable_deposit',
        id: 'generated-id-1',
        amount: {
          amountMinor: 300_00,
          currency: 'PLN'
        },
        note: ''
      },
      {
        type: 'refund',
        id: 'generated-id-2',
        amount: {
          amountMinor: 700_00,
          currency: 'PLN'
        },
        note: ''
      }
    ])
    expect(idGenerator.generatedIds).toEqual([
      'generated-id-1',
      'generated-id-2'
    ])
    expect(eventRepo.savedEvents.map((event) => event.eventName)).toEqual([
      'camp.participant.resigned',
      'camp.participant.refund_registered'
    ])
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(
      CampParticipantResignedDomainEvent
    )
    expect(eventRepo.savedEvents[1]).toBeInstanceOf(
      CampParticipantRefundRegisteredDomainEvent
    )
  })

  it('rejects resignation acceptance when the participant cannot be found', async () => {
    await expect(
      useCase.handle({
        campId: 'camp-1',
        participantId: 'missing-participant'
      })
    ).rejects.toThrow(CampParticipantNotFoundForResignationAcceptanceError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('rejects resignation acceptance when the participant belongs to a different camp', async () => {
    const participant = givenParticipantRegisteredForCamp('camp-2')
    campParticipantRepo.addParticipant(participant)

    await expect(
      useCase.handle({
        campId: 'camp-1',
        participantId: 'participant-1'
      })
    ).rejects.toThrow(CampParticipantCampMismatchForResignationAcceptanceError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('does not save partial changes when the domain rejects the resignation', async () => {
    const participant = givenParticipantRegisteredForCamp()
    const [resignedParticipant] = participant.resign()
    campParticipantRepo.addParticipant(resignedParticipant)

    await expect(
      useCase.handle({
        campId: 'camp-1',
        participantId: 'participant-1'
      })
    ).rejects.toThrow(CampParticipantResignationNotAllowedError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })
})
