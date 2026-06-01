import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createAppServices } from '@/appServices'
import { TrainerNotebookDb } from '@/db'
import type { MembershipPaymentSummaryByMonthResult } from './ObserveMembershipPaymentSummaryByMonthQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ObserveMembershipPaymentSummaryByMonthQuery', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('payment-summary-read'))
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('counts paid and unpaid members and totals the current month payment amounts', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Anna',
      lastName: 'Nowak',
      phoneNumber: '+48 111 111 111',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'Beata',
      lastName: 'Kowalska',
      phoneNumber: '+48 222 222 222',
      dateOfBirth: new Date('2011-02-02T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'Celina',
      lastName: 'Zielinska',
      phoneNumber: '+48 333 333 333',
      dateOfBirth: new Date('2012-03-03T00:00:00Z')
    })

    const persistedMembers = await database.members.toArray()

    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMembers[0].id,
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 160_00,
        currency: 'PLN'
      }
    })
    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMembers[1].id,
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 200_00,
        currency: 'PLN'
      }
    })
    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMembers[2].id,
      coveredMonth: '2026-04',
      chargedAmount: {
        amountMinor: 500_00,
        currency: 'PLN'
      }
    })

    const observable =
      services.queries.observeMembershipPaymentSummaryByMonth.handle({
        month: new Date('2026-03-15T00:00:00Z')
      })

    const [initialSummary, updatedSummary] = await new Promise<
      [
        MembershipPaymentSummaryByMonthResult,
        MembershipPaymentSummaryByMonthResult
      ]
    >((resolve, reject) => {
      const emissions: MembershipPaymentSummaryByMonthResult[] = []
      const subscription = observable.subscribe({
        next(value) {
          emissions.push(value)

          if (emissions.length === 1) {
            void services.useCases.registerMembershipPayment
              .handle({
                memberId: persistedMembers[2].id,
                coveredMonth: '2026-03',
                chargedAmount: {
                  amountMinor: 100_00,
                  currency: 'PLN'
                }
              })
              .catch((error) => {
                subscription?.unsubscribe()
                reject(error)
              })
            return
          }

          if (emissions.length === 2) {
            subscription?.unsubscribe()
            resolve([emissions[0], emissions[1]])
          }
        },
        error(error) {
          subscription?.unsubscribe()
          reject(error)
        }
      })
    })

    expect(initialSummary).toEqual({
      paidMembersCount: 2,
      unpaidMembersCount: 1,
      totalPaidAmount: {
        amountMinor: 360_00,
        currency: 'PLN'
      }
    })
    expect(updatedSummary).toEqual({
      paidMembersCount: 3,
      unpaidMembersCount: 0,
      totalPaidAmount: {
        amountMinor: 460_00,
        currency: 'PLN'
      }
    })
  })
})
