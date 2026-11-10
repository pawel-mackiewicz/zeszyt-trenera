import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteMembershipPaymentUseCase } from '@/write/memberships/application/DeleteMembershipPaymentUseCase'
import { FakeMembershipPaymentRepo } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import {
  MembershipPayment,
  MembershipPaymentNotFoundError
} from '@/write/memberships/domain/MembershipPayment'

describe('DeleteMembershipPaymentUseCase', () => {
  let membershipPaymentRepo: FakeMembershipPaymentRepo
  let uow: UnitOfWork
  let useCase: DeleteMembershipPaymentUseCase

  beforeEach(() => {
    membershipPaymentRepo = new FakeMembershipPaymentRepo()
    uow = {
      execute: vi.fn(async <T>(work: () => Promise<T>) => work())
    } as UnitOfWork
    useCase = new DeleteMembershipPaymentUseCase(uow, membershipPaymentRepo)
  })

  it('deletes a membership payment via UoW, removing the saved payment', async () => {
    const payment = MembershipPayment.record(
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
    expect(membershipPaymentRepo.deletedPaymentIds).toEqual([payment.id])
    expect(membershipPaymentRepo.savedPayments).toHaveLength(0)
  })

  it('throws when the membership payment does not exist', async () => {
    await expect(
      useCase.handle({
        membershipPaymentId: 'missing-payment'
      })
    ).rejects.toThrow(MembershipPaymentNotFoundError)
    expect(membershipPaymentRepo.deletedPaymentIds).toHaveLength(0)
  })
})
