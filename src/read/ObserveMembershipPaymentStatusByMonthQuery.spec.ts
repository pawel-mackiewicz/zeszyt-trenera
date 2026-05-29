import type { Observable } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import {
  ObserveMembershipPaymentStatusByMonthQuery,
  type MembershipPaymentStatusByMonthResult
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ObserveMembershipPaymentStatusByMonthQuery', () => {
  let database: TrainerNotebookDb
  let query: ObserveMembershipPaymentStatusByMonthQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('payments-ledger-read'))
    query = new ObserveMembershipPaymentStatusByMonthQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('splits members into paid, unpaid absent, and unpaid attended buckets for one month', async () => {
    // The read-model spec seeds persisted rows directly so it can focus on monthly bucketing without spending setup on write-side validation.
    await database.members.bulkAdd([
      {
        id: 'member-paid',
        firstName: 'Amanda',
        lastName: 'Nunes',
        phoneNumber: '+48111111111',
        dateOfBirth: new Date('1990-05-30T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z')
      },
      {
        id: 'member-absent',
        firstName: 'Georges',
        lastName: 'St-Pierre',
        phoneNumber: '+48222222222',
        dateOfBirth: new Date('1981-05-19T00:00:00Z'),
        createdAt: new Date('2026-01-02T00:00:00Z')
      },
      {
        id: 'member-attended',
        firstName: 'Royce',
        lastName: 'Gracie',
        phoneNumber: '+48333333333',
        dateOfBirth: new Date('1966-12-12T00:00:00Z'),
        createdAt: new Date('2026-01-03T00:00:00Z')
      },
      {
        id: 'member-other-month-payment',
        firstName: 'Rickson',
        lastName: 'Gracie',
        dateOfBirth: new Date('1958-11-20T00:00:00Z'),
        createdAt: new Date('2026-01-04T00:00:00Z')
      }
    ])
    await database.membershipPayments.bulkAdd([
      {
        id: 'payment-march',
        memberId: 'member-paid',
        coveredMonth: '2026-03',
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'payment-february',
        memberId: 'member-other-month-payment',
        coveredMonth: '2026-02',
        createdAt: new Date('2026-02-01T00:00:00Z')
      }
    ])
    await database.attendanceLists.bulkAdd([
      {
        id: 'attendance-1',
        memberIds: ['member-attended'],
        start: new Date('2026-03-05T18:00:00Z'),
        createdAt: new Date('2026-03-05T18:30:00Z')
      },
      {
        id: 'attendance-2',
        memberIds: ['member-attended', 'member-other-month-payment'],
        start: new Date('2026-03-20T18:00:00Z'),
        createdAt: new Date('2026-03-20T18:30:00Z')
      },
      {
        id: 'attendance-february',
        memberIds: ['member-absent'],
        start: new Date('2026-02-20T18:00:00Z'),
        createdAt: new Date('2026-02-20T18:30:00Z')
      }
    ])

    await expect(
      waitForFirstEmission(
        query.handle({
          month: new Date('2026-03-16T12:00:00Z')
        })
      )
    ).resolves.toEqual({
      paidMembers: [
        {
          id: 'member-paid',
          membershipPaymentId: 'payment-march',
          firstName: 'Amanda',
          lastName: 'Nunes',
          dateOfBirth: new Date('1990-05-30T00:00:00Z'),
          hasPhoneNumber: true
        }
      ],
      unpaidAbsentMembers: [
        {
          id: 'member-absent',
          firstName: 'Georges',
          lastName: 'St-Pierre',
          dateOfBirth: new Date('1981-05-19T00:00:00Z'),
          hasPhoneNumber: true
        }
      ],
      unpaidAttendedMembers: [
        {
          id: 'member-attended',
          firstName: 'Royce',
          lastName: 'Gracie',
          dateOfBirth: new Date('1966-12-12T00:00:00Z'),
          hasPhoneNumber: true,
          attendanceSessionIds: ['attendance-1', 'attendance-2']
        },
        {
          id: 'member-other-month-payment',
          firstName: 'Rickson',
          lastName: 'Gracie',
          dateOfBirth: new Date('1958-11-20T00:00:00Z'),
          hasPhoneNumber: false,
          attendanceSessionIds: ['attendance-2']
        }
      ]
    })
  })

  it('re-emits when a new month payment moves a member out of unpaid attended', async () => {
    await database.members.bulkAdd([
      {
        id: 'member-paid',
        firstName: 'Amanda',
        lastName: 'Nunes',
        phoneNumber: '+48111111111',
        dateOfBirth: new Date('1990-05-30T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z')
      },
      {
        id: 'member-attended',
        firstName: 'Royce',
        lastName: 'Gracie',
        phoneNumber: '+48333333333',
        dateOfBirth: new Date('1966-12-12T00:00:00Z'),
        createdAt: new Date('2026-01-03T00:00:00Z')
      }
    ])
    await database.attendanceLists.add({
      id: 'attendance-1',
      memberIds: ['member-attended'],
      start: new Date('2026-03-05T18:00:00Z'),
      createdAt: new Date('2026-03-05T18:30:00Z')
    })

    const [beforePayment, afterPayment] = await waitForMutationEmission(
      query.handle({
        month: new Date('2026-03-16T12:00:00Z')
      }),
      async () => {
        await database.membershipPayments.add({
          id: 'payment-march',
          memberId: 'member-attended',
          coveredMonth: '2026-03',
          createdAt: new Date('2026-03-10T00:00:00Z')
        })
      }
    )

    expect(beforePayment.unpaidAttendedMembers).toEqual([
      {
        id: 'member-attended',
        firstName: 'Royce',
        lastName: 'Gracie',
        dateOfBirth: new Date('1966-12-12T00:00:00Z'),
        hasPhoneNumber: true,
        attendanceSessionIds: ['attendance-1']
      }
    ])
    expect(afterPayment.paidMembers).toEqual([
      {
        id: 'member-attended',
        membershipPaymentId: 'payment-march',
        firstName: 'Royce',
        lastName: 'Gracie',
        dateOfBirth: new Date('1966-12-12T00:00:00Z'),
        hasPhoneNumber: true
      }
    ])
    expect(afterPayment.unpaidAttendedMembers).toEqual([])
  })

  it('re-emits when a new month attendance moves a member out of unpaid absent', async () => {
    await database.members.bulkAdd([
      {
        id: 'member-absent',
        firstName: 'Georges',
        lastName: 'St-Pierre',
        phoneNumber: '+48222222222',
        dateOfBirth: new Date('1981-05-19T00:00:00Z'),
        createdAt: new Date('2026-01-02T00:00:00Z')
      }
    ])

    const [beforeAttendance, afterAttendance] = await waitForMutationEmission(
      query.handle({
        month: new Date('2026-03-16T12:00:00Z')
      }),
      async () => {
        await database.attendanceLists.add({
          id: 'attendance-1',
          memberIds: ['member-absent'],
          start: new Date('2026-03-12T18:00:00Z'),
          createdAt: new Date('2026-03-12T18:30:00Z')
        })
      }
    )

    expect(beforeAttendance.unpaidAbsentMembers).toEqual([
      {
        id: 'member-absent',
        firstName: 'Georges',
        lastName: 'St-Pierre',
        dateOfBirth: new Date('1981-05-19T00:00:00Z'),
        hasPhoneNumber: true
      }
    ])
    expect(afterAttendance.unpaidAttendedMembers).toEqual([
      {
        id: 'member-absent',
        firstName: 'Georges',
        lastName: 'St-Pierre',
        dateOfBirth: new Date('1981-05-19T00:00:00Z'),
        hasPhoneNumber: true,
        attendanceSessionIds: ['attendance-1']
      }
    ])
    expect(afterAttendance.unpaidAbsentMembers).toEqual([])
  })
})

function waitForFirstEmission<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next(value) {
        resolve(value)
        queueMicrotask(() => subscription.unsubscribe())
      },
      error(error) {
        reject(error)
        queueMicrotask(() => subscription.unsubscribe())
      }
    })
  })
}

function waitForMutationEmission(
  observable: Observable<MembershipPaymentStatusByMonthResult>,
  mutate: () => Promise<void>
): Promise<
  [MembershipPaymentStatusByMonthResult, MembershipPaymentStatusByMonthResult]
> {
  return new Promise((resolve, reject) => {
    const emissions: MembershipPaymentStatusByMonthResult[] = []
    let mutationStarted = false

    const subscription = observable.subscribe({
      next(value) {
        emissions.push(value)

        if (!mutationStarted) {
          mutationStarted = true
          void mutate().catch((error) => {
            reject(error)
            queueMicrotask(() => subscription.unsubscribe())
          })
          return
        }

        resolve([emissions[0], emissions[1]])
        queueMicrotask(() => subscription.unsubscribe())
      },
      error(error) {
        reject(error)
        queueMicrotask(() => subscription.unsubscribe())
      }
    })
  })
}
