import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteMembershipPaymentUseCase } from '@/write/memberships/application/DeleteMembershipPaymentUseCase'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import { FakeMembershipPaymentRepo } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import {
  MembershipPayment,
  MembershipPaymentDeletedDomainEvent,
  MembershipPaymentNotFoundError
} from '@/write/memberships/domain/MembershipPayment'

describe('DeleteMembershipPaymentUseCase', () => {
  let membershipPaymentRepo: FakeMembershipPaymentRepo
  let savedEvents: unknown[]
  let eventRepo: EventRepoPort
  let uow: UnitOfWork
  let useCase: DeleteMembershipPaymentUseCase

  beforeEach(() => {
    membershipPaymentRepo = new FakeMembershipPaymentRepo()
    savedEvents = []
    eventRepo = {
      save: vi.fn(async (event: unknown) => {
        savedEvents.push(event)
      })
    } as unknown as EventRepoPort
    uow = {
      execute: vi.fn(async <T>(work: () => Promise<T>) => work())
    } as UnitOfWork
    useCase = new DeleteMembershipPaymentUseCase(
      uow,
      membershipPaymentRepo,
      eventRepo
    )
  })

  it('deletes a membership payment via UoW, saving a tombstone event first', async () => {
    const [payment] = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )
    await membershipPaymentRepo.save(payment)

    await useCase.handle({
      membershipPaymentId: payment.id
    })

    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(savedEvents).toHaveLength(1)
    expect(savedEvents[0]).toBeInstanceOf(MembershipPaymentDeletedDomainEvent)
    expect(
      (savedEvents[0] as MembershipPaymentDeletedDomainEvent).payload
    ).toEqual(payment.toSnapshot())
    expect(membershipPaymentRepo.deletedPaymentIds).toEqual([payment.id])
    expect(membershipPaymentRepo.savedPayments).toHaveLength(0)
  })

  it('throws when the membership payment does not exist', async () => {
    await expect(
      useCase.handle({
        membershipPaymentId: 'missing-payment'
      })
    ).rejects.toThrow(MembershipPaymentNotFoundError)

    expect(savedEvents).toHaveLength(0)
    expect(eventRepo.save).not.toHaveBeenCalled()
    expect(membershipPaymentRepo.deletedPaymentIds).toHaveLength(0)
  })
})
