import { describe, expect, it } from 'vitest'

import {
  CampParticipant,
  CampParticipantCurrencyMismatchError,
  CampParticipantDiscountAppliedDomainEvent,
  CampParticipantDiscountExceedsAmountDueError,
  CampParticipantPaymentRegisteredDomainEvent,
  CampParticipantRegisteredDomainEvent,
  CampParticipantRefundRegisteredDomainEvent,
  InvalidCampParticipantCampIdError,
  InvalidCampParticipantMemberIdError,
  InvalidExternalCampParticipantNameError
} from '@/write/camps/domain/CampParticipant'
import {
  InvalidFinancialTransactionAmountError,
  InvalidFinancialTransactionIdError
} from '@/write/shared/vo/FinancialTransaction'
import { Money } from '@/write/shared/vo/Money'

const money = (amountMinor: number, currency = 'PLN') =>
  Money.create({
    amountMinor,
    currency
  })

const registerClubParticipant = () =>
  CampParticipant.register({
    campId: 'camp-1',
    person: {
      type: 'club',
      memberId: 'member-1'
    },
    totalAmountDue: money(1200_00)
  })

describe('CampParticipant', () => {
  it('registers a club participant with required properties and emits an event', () => {
    const totalAmountDue = money(1200_00)
    const beforeRegistration = new Date()

    const [participant, event] = CampParticipant.register({
      campId: '  camp-1  ',
      person: {
        type: 'club',
        memberId: '  member-1  '
      },
      totalAmountDue
    })

    const afterRegistration = new Date()

    expect(participant.campId).toBe('camp-1')
    expect(participant.person).toEqual({
      type: 'club',
      memberId: 'member-1'
    })
    expect(participant.status).toBe('REGISTERED')
    expect(participant.totalAmountDue.toSnapshot()).toEqual(
      totalAmountDue.toSnapshot()
    )
    expect(participant.discounts).toEqual([])
    expect(participant.financialTransactions).toEqual([])
    expect(participant.addedAt.getTime()).toBeGreaterThanOrEqual(
      beforeRegistration.getTime()
    )
    expect(participant.addedAt.getTime()).toBeLessThanOrEqual(
      afterRegistration.getTime()
    )
    expect(participant.updatedAt).toEqual(participant.addedAt)

    expect(event).toBeInstanceOf(CampParticipantRegisteredDomainEvent)
    expect(event.eventName).toBe('camp.participant.registered')
    expect(event.payload).toEqual(participant.toSnapshot())
  })

  it('registers an external participant and standardizes their name', () => {
    const [participant] = CampParticipant.register({
      campId: 'camp-1',
      person: {
        type: 'external',
        firstName: '  Anna  ',
        lastName: '  Kowalska-Nowak  '
      },
      totalAmountDue: money(1200_00)
    })

    expect(participant.person).toEqual({
      type: 'external',
      firstName: 'anna',
      lastName: 'kowalska-nowak'
    })
  })

  it('applies a discount by reducing the amount due and emitting an event', () => {
    const [participant] = registerClubParticipant()
    const beforeDiscount = new Date()

    const [discountedParticipant, event] = participant.applyDiscount({
      id: '  discount-1  ',
      amount: money(200_00),
      reason: '  Sibling discount  '
    })

    const afterDiscount = new Date()

    expect(discountedParticipant).not.toBe(participant)
    expect(participant.totalAmountDue.toSnapshot()).toEqual(
      money(1200_00).toSnapshot()
    )
    expect(participant.discounts).toEqual([])
    expect(discountedParticipant.totalAmountDue.toSnapshot()).toEqual(
      money(1000_00).toSnapshot()
    )
    expect(discountedParticipant.status).toBe('REGISTERED')
    expect(discountedParticipant.discounts).toHaveLength(1)
    expect(discountedParticipant.discounts[0]).toMatchObject({
      id: 'discount-1',
      amount: money(200_00),
      reason: 'Sibling discount'
    })
    expect(
      discountedParticipant.discounts[0].createdAt.getTime()
    ).toBeGreaterThanOrEqual(beforeDiscount.getTime())
    expect(discountedParticipant.updatedAt.getTime()).toBeLessThanOrEqual(
      afterDiscount.getTime()
    )
    expect(discountedParticipant.updatedAt).toEqual(
      discountedParticipant.discounts[0].createdAt
    )

    expect(event).toBeInstanceOf(CampParticipantDiscountAppliedDomainEvent)
    expect(event.eventName).toBe('camp.participant.discount_applied')
    expect(event.payload).toEqual(discountedParticipant.toSnapshot())
  })

  it('registers payments and marks the participant fully paid when balance covers amount due', () => {
    const [participant] = registerClubParticipant()

    const [partiallyPaidParticipant] = participant.registerPayment({
      id: 'payment-1',
      amount: money(500_00),
      note: 'First installment'
    })
    expect(partiallyPaidParticipant).not.toBe(participant)
    expect(participant.status).toBe('REGISTERED')
    expect(participant.financialTransactions).toEqual([])
    expect(partiallyPaidParticipant.status).toBe('REGISTERED')
    expect(partiallyPaidParticipant.financialTransactions).toHaveLength(1)
    expect(partiallyPaidParticipant.financialTransactions[0]).toMatchObject({
      type: 'payment',
      id: 'payment-1',
      amount: money(500_00),
      note: 'First installment'
    })

    const [fullyPaidParticipant, event] =
      partiallyPaidParticipant.registerPayment({
        id: 'payment-2',
        amount: money(700_00),
        note: 'Final installment'
      })

    expect(fullyPaidParticipant).not.toBe(partiallyPaidParticipant)
    expect(partiallyPaidParticipant.status).toBe('REGISTERED')
    expect(partiallyPaidParticipant.financialTransactions).toHaveLength(1)
    expect(fullyPaidParticipant.status).toBe('FULLY_PAID')
    expect(fullyPaidParticipant.financialTransactions).toHaveLength(2)

    expect(event).toBeInstanceOf(CampParticipantPaymentRegisteredDomainEvent)
    expect(event.eventName).toBe('camp.participant.payment_registered')
    expect(event.payload).toEqual(fullyPaidParticipant.toSnapshot())
  })

  it('allows a discount after payment when the participant will need a refund', () => {
    const [participant] = registerClubParticipant()
    const [fullyPaidParticipant] = participant.registerPayment({
      id: 'payment-1',
      amount: money(1200_00)
    })
    expect(fullyPaidParticipant.status).toBe('FULLY_PAID')
    expect(participant.status).toBe('REGISTERED')

    const [discountedParticipant] = fullyPaidParticipant.applyDiscount({
      id: 'discount-1',
      amount: money(200_00),
      reason: 'Late discount'
    })

    expect(discountedParticipant.status).toBe('FULLY_PAID')
    expect(discountedParticipant.totalAmountDue.toSnapshot()).toEqual(
      money(1000_00).toSnapshot()
    )
    expect(discountedParticipant.financialTransactions).toHaveLength(1)
  })

  it('registers refunds and recalculates payment status from net balance', () => {
    const [participant] = registerClubParticipant()
    const [fullyPaidParticipant] = participant.registerPayment({
      id: 'payment-1',
      amount: money(1200_00),
      note: 'Paid in full'
    })
    expect(fullyPaidParticipant.status).toBe('FULLY_PAID')

    const [refundedParticipant, event] = fullyPaidParticipant.registerRefund({
      id: '  refund-1  ',
      amount: money(200_00),
      note: '  Partial refund  '
    })

    expect(refundedParticipant).not.toBe(fullyPaidParticipant)
    expect(fullyPaidParticipant.status).toBe('FULLY_PAID')
    expect(fullyPaidParticipant.financialTransactions).toHaveLength(1)
    expect(refundedParticipant.status).toBe('REGISTERED')
    expect(refundedParticipant.financialTransactions).toHaveLength(2)
    expect(refundedParticipant.financialTransactions[1]).toMatchObject({
      type: 'refund',
      id: 'refund-1',
      amount: money(200_00),
      note: 'Partial refund'
    })
    expect(refundedParticipant.updatedAt).toEqual(
      refundedParticipant.financialTransactions[1].createdAt
    )

    expect(event).toBeInstanceOf(CampParticipantRefundRegisteredDomainEvent)
    expect(event.eventName).toBe('camp.participant.refund_registered')
    expect(event.payload).toEqual(refundedParticipant.toSnapshot())
  })

  it('keeps person, dates, money, discounts, and transactions immutable', () => {
    const person = {
      type: 'external' as const,
      firstName: 'Anna',
      lastName: 'Kowalska'
    }
    const [participant] = CampParticipant.register({
      campId: 'camp-1',
      person,
      totalAmountDue: money(1200_00)
    })
    const [discountedParticipant] = participant.applyDiscount({
      id: 'discount-1',
      amount: money(200_00)
    })
    const [paidParticipant] = discountedParticipant.registerPayment({
      id: 'payment-1',
      amount: money(300_00)
    })

    person.firstName = 'Changed'

    const exposedPerson = paidParticipant.person
    const exposedDiscounts = paidParticipant.discounts
    const exposedTransactions = paidParticipant.financialTransactions
    const snapshot = paidParticipant.toSnapshot()

    if (exposedPerson.type === 'external') {
      exposedPerson.firstName = 'Changed again'
    }

    exposedDiscounts[0].reason = 'Changed reason'
    exposedDiscounts[0].createdAt.setUTCFullYear(2040)
    exposedTransactions[0].note = 'Changed note'
    exposedTransactions[0].createdAt.setUTCFullYear(2041)
    snapshot.addedAt.setUTCFullYear(2042)
    snapshot.updatedAt.setUTCFullYear(2043)

    expect(paidParticipant.person).toEqual({
      type: 'external',
      firstName: 'anna',
      lastName: 'kowalska'
    })
    expect(paidParticipant.totalAmountDue.toSnapshot()).toEqual(
      money(1000_00).toSnapshot()
    )
    expect(paidParticipant.discounts[0].reason).toBe('')
    expect(paidParticipant.discounts[0].createdAt).not.toEqual(
      exposedDiscounts[0].createdAt
    )
    expect(paidParticipant.financialTransactions[0].note).toBe('')
    expect(paidParticipant.financialTransactions[0].createdAt).not.toEqual(
      exposedTransactions[0].createdAt
    )
    expect(paidParticipant.addedAt).not.toEqual(snapshot.addedAt)
    expect(paidParticipant.updatedAt).not.toEqual(snapshot.updatedAt)
  })

  it('rehydrates a participant snapshot with payments and refunds', () => {
    const addedAt = new Date('2026-03-01T10:00:00Z')
    const updatedAt = new Date('2026-03-02T10:00:00Z')
    const discountCreatedAt = new Date('2026-03-01T11:00:00Z')
    const paymentCreatedAt = new Date('2026-03-01T12:00:00Z')
    const refundCreatedAt = new Date('2026-03-01T13:00:00Z')
    const participant = CampParticipant.rehydrate({
      campId: 'camp-1',
      person: {
        type: 'club',
        memberId: 'member-1'
      },
      status: 'REGISTERED',
      totalAmountDue: money(1000_00),
      discounts: [
        {
          id: 'discount-1',
          amount: money(200_00),
          reason: 'Sibling discount',
          createdAt: discountCreatedAt
        }
      ],
      financialTransactions: [
        {
          type: 'payment',
          id: 'payment-1',
          amount: money(1000_00),
          note: 'Paid in full',
          createdAt: paymentCreatedAt
        },
        {
          type: 'refund',
          id: 'refund-1',
          amount: money(200_00),
          note: 'Refunded discount',
          createdAt: refundCreatedAt
        }
      ],
      addedAt,
      updatedAt
    })

    addedAt.setUTCFullYear(2040)
    updatedAt.setUTCFullYear(2041)
    discountCreatedAt.setUTCFullYear(2042)
    paymentCreatedAt.setUTCFullYear(2043)
    refundCreatedAt.setUTCFullYear(2044)

    expect(participant.toSnapshot()).toEqual({
      campId: 'camp-1',
      person: {
        type: 'club',
        memberId: 'member-1'
      },
      status: 'REGISTERED',
      totalAmountDue: money(1000_00),
      discounts: [
        {
          id: 'discount-1',
          amount: money(200_00),
          reason: 'Sibling discount',
          createdAt: new Date('2026-03-01T11:00:00Z')
        }
      ],
      financialTransactions: [
        {
          type: 'payment',
          id: 'payment-1',
          amount: money(1000_00),
          note: 'Paid in full',
          createdAt: new Date('2026-03-01T12:00:00Z')
        },
        {
          type: 'refund',
          id: 'refund-1',
          amount: money(200_00),
          note: 'Refunded discount',
          createdAt: new Date('2026-03-01T13:00:00Z')
        }
      ],
      addedAt: new Date('2026-03-01T10:00:00Z'),
      updatedAt: new Date('2026-03-02T10:00:00Z')
    })
  })

  it('rejects invalid participant identity', () => {
    expect(() =>
      CampParticipant.register({
        campId: '  ',
        person: {
          type: 'club',
          memberId: 'member-1'
        },
        totalAmountDue: money(1200_00)
      })
    ).toThrow(InvalidCampParticipantCampIdError)

    expect(() =>
      CampParticipant.register({
        campId: 'camp-1',
        person: {
          type: 'club',
          memberId: '  '
        },
        totalAmountDue: money(1200_00)
      })
    ).toThrow(InvalidCampParticipantMemberIdError)

    expect(() =>
      CampParticipant.register({
        campId: 'camp-1',
        person: {
          type: 'external',
          firstName: 'Anna',
          lastName: ''
        },
        totalAmountDue: money(1200_00)
      })
    ).toThrow(InvalidExternalCampParticipantNameError)

    expect(() =>
      CampParticipant.register({
        campId: 'camp-1',
        person: {
          type: 'external',
          firstName: 'Anna!',
          lastName: 'Kowalska'
        },
        totalAmountDue: money(1200_00)
      })
    ).toThrow(InvalidExternalCampParticipantNameError)
  })

  it('rejects invalid financial transaction details', () => {
    const [participant] = registerClubParticipant()

    expect(() =>
      participant.registerPayment({
        id: '  ',
        amount: money(100_00)
      })
    ).toThrow(InvalidFinancialTransactionIdError)

    expect(() =>
      participant.applyDiscount({
        id: 'discount-1',
        amount: money(0)
      })
    ).toThrow(InvalidFinancialTransactionAmountError)

    expect(() =>
      participant.registerPayment({
        id: 'payment-1',
        amount: money(100_00, 'EUR')
      })
    ).toThrow(CampParticipantCurrencyMismatchError)

    expect(() =>
      participant.registerRefund({
        id: 'refund-1',
        amount: money(100_00, 'EUR')
      })
    ).toThrow(CampParticipantCurrencyMismatchError)
  })

  it('rejects discounts that exceed the current amount due', () => {
    const [participant] = registerClubParticipant()

    expect(() =>
      participant.applyDiscount({
        id: 'discount-1',
        amount: money(1300_00)
      })
    ).toThrow(CampParticipantDiscountExceedsAmountDueError)
  })
})
