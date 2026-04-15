import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MembershipPayment } from '@/write/domain/model/MembershipPayment'
import { TrainerNotebookDb } from '@/db'
import { DexieMembershipPaymentRepo } from '@/write/infra/db/DexieMembershipPaymentRepo'

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
    const [payment] = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(payment)

    const persistedPayments = await database.membershipPayments.toArray()

    expect(persistedPayments).toHaveLength(1)
    expect(persistedPayments[0]).toMatchObject({
      id: payment.id,
      memberId: payment.memberId,
      coveredMonth: payment.coveredMonth,
      createdAt: payment.createdAt
    })
  })

  it('reports when no matching member-month payment exists yet', async () => {
    await expect(
      repository.existsByMemberIdAndCoveredMonth('member-1', '2026-03')
    ).resolves.toBe(false)
  })

  it('reports when the same member and covered month already have a payment', async () => {
    const [payment] = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(payment)

    await expect(
      repository.existsByMemberIdAndCoveredMonth('member-1', '2026-03')
    ).resolves.toBe(true)
  })

  it('does not treat a different covered month as a duplicate', async () => {
    const [payment] = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(payment)

    await expect(
      repository.existsByMemberIdAndCoveredMonth('member-1', '2026-04')
    ).resolves.toBe(false)
  })
})
