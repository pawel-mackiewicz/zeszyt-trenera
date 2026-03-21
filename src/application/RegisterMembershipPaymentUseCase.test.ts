import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RegisterMembershipPaymentUseCase } from './RegisterMembershipPaymentUseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterMembershipPaymentCommand } from '@/application/requests/RegisterMembershipPaymentCommand'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import {
  MembershipPayment,
  MembershipPaymentAlreadyExistsError,
  MembershipPaymentRecordedDomainEvent
} from '@/domain/model/MembershipPayment'
import { Member, MemberNotFoundError } from '@/domain/model/member'

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

class FakeMemberRepo implements MemberRepoPort {
  public readonly savedMembers: Member[] = []
  public readonly existsByIdChecks: string[] = []
  public existingMemberIds = new Set<string>()

  async save(member: Member): Promise<void> {
    this.savedMembers.push(member)
  }

  async existsById(memberId: string): Promise<boolean> {
    this.existsByIdChecks.push(memberId)

    return (
      this.existingMemberIds.has(memberId) ||
      this.savedMembers.some((member) => member.id === memberId)
    )
  }

  async existsByNameAndPhone(): Promise<boolean> {
    return false
  }
}

class FakeMembershipPaymentRepo implements MembershipPaymentRepoPort {
  public readonly savedPayments: MembershipPayment[] = []
  public readonly existsChecks: Array<{
    memberId: string
    coveredMonth: string
  }> = []
  public existingKeys = new Set<string>()

  async save(payment: MembershipPayment): Promise<void> {
    this.savedPayments.push(payment)
  }

  async existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean> {
    this.existsChecks.push({
      memberId,
      coveredMonth
    })

    const key = `${memberId}::${coveredMonth}`

    return (
      this.existingKeys.has(key) ||
      this.savedPayments.some(
        (payment) =>
          payment.memberId === memberId && payment.coveredMonth === coveredMonth
      )
    )
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
      coveredMonth: '2026-03'
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
      (savedEvent as MembershipPaymentRecordedDomainEvent).payment
    ).toEqual(savedPayment.toSnapshot())
  })

  it('throws when trying to record a membership payment for an unknown member', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing-member',
        coveredMonth: '2026-03'
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
        coveredMonth: '2026-03'
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
      coveredMonth: '2026-03'
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
