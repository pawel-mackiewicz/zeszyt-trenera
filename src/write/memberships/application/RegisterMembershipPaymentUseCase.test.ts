import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RegisterMembershipPaymentUseCase } from './RegisterMembershipPaymentUseCase'
import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import { FakeMembershipPaymentRepo } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { RegisterMembershipPaymentCommand } from '@/write/memberships/application/requests/RegisterMembershipPaymentCommand'
import {
  MembershipPaymentAlreadyExistsError,
  MembershipPaymentRecordedDomainEvent
} from '@/write/memberships/domain/MembershipPayment'
import { MemberNotFoundError } from '@/write/members/domain/Member'
class FakeUnitOfWork implements UnitOfWork {
  private current: Promise<void> = Promise.resolve()

  async execute<T>(action: () => Promise<T>): Promise<T> {
    const run = this.current.then(action, action)

    this.current = run.then(
      () => undefined,
      () => undefined
    )

    return await run
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  public readonly generatedIds: string[] = []

  generate(): string {
    const id = 'membership-payment-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterMembershipPaymentUseCase', () => {
  let uow: FakeUnitOfWork
  let memberRepo: FakeMemberRepo
  let membershipPaymentRepo: FakeMembershipPaymentRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterMembershipPaymentUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    memberRepo = new FakeMemberRepo()
    membershipPaymentRepo = new FakeMembershipPaymentRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterMembershipPaymentUseCase(
      uow,
      memberRepo,
      membershipPaymentRepo,
      eventRepo,
      idGenerator
    )
  })

  it('records a membership payment via UoW, saving the payment and related domain event', async () => {
    memberRepo.existingMemberIds.add('member-1')

    const dto: RegisterMembershipPaymentCommand = {
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 120_00,
        currency: 'PLN'
      }
    }

    await useCase.handle(dto)

    expect(memberRepo.existsByIdChecks).toEqual(['member-1'])
    expect(membershipPaymentRepo.existsChecks).toEqual([
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      }
    ])
    expect(uow.execute).toHaveBeenCalledTimes(1)

    expect(membershipPaymentRepo.savedPayments).toHaveLength(1)
    const savedPayment = membershipPaymentRepo.savedPayments[0]
    expect(savedPayment).toMatchObject({
      memberId: 'member-1',
      coveredMonth: '2026-03'
    })
    expect(savedPayment.chargedAmount?.toSnapshot()).toEqual({
      amountMinor: 120_00,
      currency: 'PLN'
    })
    // The fixed ID proves the workflow consumes the injected generator instead of delegating infrastructure concerns into the aggregate.
    expect(savedPayment.id).toBe('membership-payment-generated-by-test')
    expect(idGenerator.generatedIds).toEqual([
      'membership-payment-generated-by-test'
    ])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('membership-payment.recorded')
    // The assertion narrows to the concrete event type so the test documents that the event log stores a snapshot payload, not the mutable aggregate instance itself.
    expect(savedEvent).toBeInstanceOf(MembershipPaymentRecordedDomainEvent)
    expect(
      (savedEvent as MembershipPaymentRecordedDomainEvent).payload
    ).toEqual(savedPayment.toSnapshot())
  })

  it('throws when trying to record a membership payment for an unknown member', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing-member',
        coveredMonth: '2026-03',
        chargedAmount: {
          amountMinor: 120_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(MemberNotFoundError)

    expect(memberRepo.existsByIdChecks).toEqual(['missing-member'])
    expect(membershipPaymentRepo.existsChecks).toHaveLength(0)
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(membershipPaymentRepo.savedPayments).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('throws when the same member and covered month already have a payment', async () => {
    memberRepo.existingMemberIds.add('member-1')
    membershipPaymentRepo.existingKeys.add('member-1::2026-03')

    await expect(
      useCase.handle({
        memberId: 'member-1',
        coveredMonth: '2026-03',
        chargedAmount: {
          amountMinor: 120_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(MembershipPaymentAlreadyExistsError)

    expect(memberRepo.existsByIdChecks).toEqual(['member-1'])
    expect(membershipPaymentRepo.existsChecks).toEqual([
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      }
    ])
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(membershipPaymentRepo.savedPayments).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('rejects a concurrent second payment registration for the same member and covered month', async () => {
    memberRepo.existingMemberIds.add('member-1')

    const dto: RegisterMembershipPaymentCommand = {
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 120_00,
        currency: 'PLN'
      }
    }

    const results = await Promise.allSettled([
      useCase.handle(dto),
      useCase.handle(dto)
    ])

    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === 'rejected')
    ).toHaveLength(1)
    expect(
      results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )?.reason
    ).toBeInstanceOf(MembershipPaymentAlreadyExistsError)
    expect(membershipPaymentRepo.savedPayments).toHaveLength(1)
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(idGenerator.generatedIds).toEqual([
      'membership-payment-generated-by-test'
    ])
  })
})
