import { describe, expect, it } from 'vitest'

import {
  InvalidMembershipPaymentCoveredMonthError,
  MembershipPayment,
  MembershipPaymentRecordedDomainEvent,
  toMembershipPaymentCoveredMonth
} from '@/write/domain/model/MembershipPayment'
import { Money } from '@/write/domain/model/vo/Money'

describe('MembershipPayment Model', () => {
  it('records a membership payment with all required properties', () => {
    const id = 'payment-1'
    const beforeCreation = new Date()

    // Passing the ID explicitly proves the aggregate follows the same boundary as the other models and does not generate identifiers on its own.
    const [payment, event] = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03',
        chargedAmount: Money.create({
          amountMinor: 12000,
          currency: 'PLN'
        })
      },
      id
    )

    const afterCreation = new Date()

    expect(payment.id).toBe(id)
    expect(payment.memberId).toBe('member-1')
    expect(payment.coveredMonth).toBe('2026-03')
    expect(payment.chargedAmount?.toSnapshot()).toEqual({
      amountMinor: 12000,
      currency: 'PLN'
    })

    expect(payment.createdAt).toBeDefined()
    expect(payment.createdAt).toBeInstanceOf(Date)
    expect(payment.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(payment.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )

    expect(payment.toSnapshot()).toEqual({
      id,
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 12000,
        currency: 'PLN'
      },
      createdAt: payment.createdAt
    })

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
    expect(event).toBeInstanceOf(MembershipPaymentRecordedDomainEvent)
    // The raw payload is now the canonical event contract so future persistence adapters can store the snapshot without wrapper-specific mapping.
    expect(event.payload).toEqual(payment.toSnapshot())
  })

  it('restores an existing membership payment from persisted state', () => {
    const payment = MembershipPayment.restore({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 9000,
        currency: 'PLN'
      },
      createdAt: new Date('2026-03-20T00:00:00Z')
    })

    expect(payment).toBeInstanceOf(MembershipPayment)
    expect(payment).toMatchObject({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: Money.create({
        amountMinor: 9000,
        currency: 'PLN'
      }),
      createdAt: new Date('2026-03-20T00:00:00Z')
    })
    expect(payment.toSnapshot()).toEqual({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 9000,
        currency: 'PLN'
      },
      createdAt: new Date('2026-03-20T00:00:00Z')
    })
  })

  it('restores legacy persisted membership payments without charged amount as null', () => {
    const payment = MembershipPayment.restore({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-03',
      createdAt: new Date('2026-03-20T00:00:00Z')
    })

    expect(payment.chargedAmount).toBeNull()
    expect(payment.toSnapshot()).toEqual({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: null,
      createdAt: new Date('2026-03-20T00:00:00Z')
    })
  })

  it('keeps createdAt immutable when callers mutate shared references', () => {
    const originalCreatedAt = new Date('2026-03-20T00:00:00Z')
    const payment = MembershipPayment.restore({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-03',
      chargedAmount: null,
      createdAt: originalCreatedAt
    })

    // Mutating caller-owned dates must not leak back into the aggregate because restore accepts persistence-owned objects.
    originalCreatedAt.setUTCFullYear(2030)
    expect(payment.createdAt).toEqual(new Date('2026-03-20T00:00:00Z'))

    // Snapshot and getter consumers need the same isolation so read access never becomes write access by reference.
    const exposedCreatedAt = payment.createdAt
    const snapshot = payment.toSnapshot()

    exposedCreatedAt.setUTCFullYear(2031)
    snapshot.createdAt.setUTCFullYear(2032)

    expect(payment.createdAt).toEqual(new Date('2026-03-20T00:00:00Z'))
    expect(payment.toSnapshot().createdAt).toEqual(
      new Date('2026-03-20T00:00:00Z')
    )
  })

  it('rejects invalid coveredMonth values during record', () => {
    expect(() =>
      MembershipPayment.record(
        {
          memberId: 'member-1',
          coveredMonth: '2026-3',
          chargedAmount: Money.create({
            amountMinor: 12000,
            currency: 'PLN'
          })
        },
        'payment-1'
      )
    ).toThrow(InvalidMembershipPaymentCoveredMonthError)

    expect(() =>
      MembershipPayment.record(
        {
          memberId: 'member-1',
          coveredMonth: '2026-13',
          chargedAmount: Money.create({
            amountMinor: 12000,
            currency: 'PLN'
          })
        },
        'payment-1'
      )
    ).toThrow(InvalidMembershipPaymentCoveredMonthError)
  })

  it('rejects invalid coveredMonth values during restore', () => {
    expect(() =>
      MembershipPayment.restore({
        id: 'payment-1',
        memberId: 'member-1',
        coveredMonth: '03-2026',
        chargedAmount: null,
        createdAt: new Date('2026-03-20T00:00:00Z')
      })
    ).toThrow(InvalidMembershipPaymentCoveredMonthError)

    expect(() =>
      MembershipPayment.restore({
        id: 'payment-1',
        memberId: 'member-1',
        coveredMonth: '2026/03',
        chargedAmount: null,
        createdAt: new Date('2026-03-20T00:00:00Z')
      })
    ).toThrow(InvalidMembershipPaymentCoveredMonthError)
  })

  it('formats a calendar month into the canonical covered-month key', () => {
    // The formatter lives with the domain contract so every caller derives the same persistence key before touching the write model.
    expect(
      toMembershipPaymentCoveredMonth(new Date('2026-03-20T15:30:00Z'))
    ).toBe('2026-03')
  })
})
