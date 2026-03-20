import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MembershipPayment } from '@/domain/model/MembershipPayment'
import { TrainerNotebookDb } from '@/infra/db'
import { DexieMembershipPaymentRepo } from '@/infra/db/DexieMembershipPaymentRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieMembershipPaymentRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieMembershipPaymentRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(
      createTestDbName('membership-payment-repo')
    )
    repository = new DexieMembershipPaymentRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists a membership payment into Dexie', async () => {
    const event = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(event.payment)

    const persistedPayments = await database.membershipPayments.toArray()

    expect(persistedPayments).toHaveLength(1)
    expect(persistedPayments[0]).toMatchObject({
      id: event.payment.id,
      memberId: event.payment.memberId,
      coveredMonth: event.payment.coveredMonth,
      createdAt: event.payment.createdAt
    })
  })

  it('reports when no matching member-month payment exists yet', async () => {
    await expect(
      repository.existsByMemberIdAndCoveredMonth('member-1', '2026-03')
    ).resolves.toBe(false)
  })

  it('reports when the same member and covered month already have a payment', async () => {
    const event = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(event.payment)

    await expect(
      repository.existsByMemberIdAndCoveredMonth('member-1', '2026-03')
    ).resolves.toBe(true)
  })

  it('does not treat a different covered month as a duplicate', async () => {
    const event = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(event.payment)

    await expect(
      repository.existsByMemberIdAndCoveredMonth('member-1', '2026-04')
    ).resolves.toBe(false)
  })
})
