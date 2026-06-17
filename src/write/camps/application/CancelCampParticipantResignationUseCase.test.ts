import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CampParticipantCampMismatchForResignationCancellationError,
  CampParticipantNotFoundForResignationCancellationError,
  CancelCampParticipantResignationUseCase
} from '@/write/camps/application/CancelCampParticipantResignationUseCase'
import { FakeCampParticipantRepo } from '@/write/camps/application/ports/CampParticipantRepoPort'
import {
  CampParticipant,
  CampParticipantResignationCanceledDomainEvent,
  CampParticipantResignationCancellationNotAllowedError
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

const givenParticipantResigned = (
  participant: CampParticipant,
  depositAmountMinor?: number
): CampParticipant => {
  const [resignedParticipant] = participant.resign(
    depositAmountMinor
      ? {
          id: 'deposit-1',
          amount: Money.create({
            amountMinor: depositAmountMinor,
            currency: 'PLN'
          }),
          note: 'retained deposit'
        }
      : undefined
  )

  return resignedParticipant
}

describe('CancelCampParticipantResignationUseCase', () => {
  let uow: FakeUnitOfWork
  let campParticipantRepo: FakeCampParticipantRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: CancelCampParticipantResignationUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    campParticipantRepo = new FakeCampParticipantRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new CancelCampParticipantResignationUseCase(
      uow,
      campParticipantRepo,
      eventRepo,
      idGenerator
    )
  })

  it('cancels a participant resignation via UoW, updating the participant and saving the event', async () => {
    const participant = givenParticipantResigned(
      givenParticipantRegisteredForCamp()
    )
    campParticipantRepo.addParticipant(participant)

    await useCase.handle({
      campId: 'camp-1',
      participantId: 'participant-1'
    })

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(campParticipantRepo.updatedParticipants).toHaveLength(1)
    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.id).toBe('participant-1')
    expect(updatedParticipant.status).toBe('REGISTERED')
    expect(updatedParticipant.financialTransactions).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent).toBeInstanceOf(
      CampParticipantResignationCanceledDomainEvent
    )
    expect(savedEvent.eventName).toBe('camp.participant.resignation_canceled')
    expect(
      (savedEvent as CampParticipantResignationCanceledDomainEvent).payload
    ).toEqual(updatedParticipant.toSnapshot())
  })

  it('cancels resignation with a retained deposit by appending a deposit reversal', async () => {
    const participant = givenParticipantResigned(
      givenParticipantPaid(givenParticipantRegisteredForCamp()),
      300_00
    )
    campParticipantRepo.addParticipant(participant)

    await useCase.handle({
      campId: 'camp-1',
      participantId: 'participant-1'
    })

    const updatedParticipant = campParticipantRepo.updatedParticipants[0]
    expect(updatedParticipant.status).toBe('FULLY_PAID')
    expect(updatedParticipant.remainingAmountToPay().toSnapshot()).toEqual({
      amountMinor: 0,
      currency: 'PLN'
    })
    expect(
      updatedParticipant.financialTransactions.map((transaction) => ({
        type: transaction.type,
        id: transaction.id,
        amount: transaction.amount.toSnapshot(),
        note: transaction.note,
        reversedTransactionId:
          transaction.type === 'non_refundable_deposit_reversal'
            ? transaction.reversedTransactionId
            : undefined
      }))
    ).toEqual([
      {
        type: 'payment',
        id: 'payment-1',
        amount: {
          amountMinor: 1000_00,
          currency: 'PLN'
        },
        note: 'advance',
        reversedTransactionId: undefined
      },
      {
        type: 'non_refundable_deposit',
        id: 'deposit-1',
        amount: {
          amountMinor: 300_00,
          currency: 'PLN'
        },
        note: 'retained deposit',
        reversedTransactionId: undefined
      },
      {
        type: 'non_refundable_deposit_reversal',
        id: 'generated-id-1',
        amount: {
          amountMinor: 300_00,
          currency: 'PLN'
        },
        note: '',
        reversedTransactionId: 'deposit-1'
      }
    ])
    expect(idGenerator.generatedIds).toEqual(['generated-id-1'])
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('rejects resignation cancellation when the participant cannot be found', async () => {
    await expect(
      useCase.handle({
        campId: 'camp-1',
        participantId: 'missing-participant'
      })
    ).rejects.toThrow(CampParticipantNotFoundForResignationCancellationError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('rejects resignation cancellation when the participant belongs to a different camp', async () => {
    const participant = givenParticipantResigned(
      givenParticipantRegisteredForCamp('camp-2')
    )
    campParticipantRepo.addParticipant(participant)

    await expect(
      useCase.handle({
        campId: 'camp-1',
        participantId: 'participant-1'
      })
    ).rejects.toThrow(
      CampParticipantCampMismatchForResignationCancellationError
    )

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('does not save partial changes when the domain rejects the cancellation', async () => {
    const participant = givenParticipantRegisteredForCamp()
    campParticipantRepo.addParticipant(participant)

    await expect(
      useCase.handle({
        campId: 'camp-1',
        participantId: 'participant-1'
      })
    ).rejects.toThrow(CampParticipantResignationCancellationNotAllowedError)

    expect(campParticipantRepo.updatedParticipants).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
    expect(idGenerator.generatedIds).toEqual([])
  })
})
