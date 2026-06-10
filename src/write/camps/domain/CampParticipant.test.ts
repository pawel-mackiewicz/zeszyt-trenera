import { describe, expect, it } from 'vitest'

import {
  CampParticipant,
  CampParticipantCurrencyMismatchError,
  CampParticipantDiscountAppliedDomainEvent,
  CampParticipantDiscountExceedsAmountDueError,
  CampParticipantDiscountNotAllowedError,
  CampParticipantNonRefundableDepositExceedsPaidBalanceError,
  CampParticipantPaymentNotAllowedError,
  CampParticipantPaymentRegisteredDomainEvent,
  CampParticipantRefundExceedsRefundableBalanceError,
  CampParticipantRefundNotAllowedError,
  CampParticipantRefundRegisteredDomainEvent,
  CampParticipantRegisteredDomainEvent,
  CampParticipantResignationNotAllowedError,
  CampParticipantResignedDomainEvent,
  InvalidCampParticipantCampIdError,
  InvalidCampParticipantMemberIdError,
  InvalidExternalCampParticipantNameError,
  type CampParticipantSnapshot
} from '@/write/camps/domain/CampParticipant'
import {
  InvalidFinancialTransactionAmountError,
  InvalidFinancialTransactionIdError
} from '@/write/shared/vo/FinancialTransaction'
import { Money } from '@/write/shared/vo/Money'

const PARTICIPANT_ID = 'participant-1'
const CAMP_ID = 'camp-1'
const MEMBER_ID = 'member-1'
const CAMP_PRICE = 1200_00

type CampParticipantEvent = {
  eventName: string
  payload: CampParticipantSnapshot
}

type TransactionStoryInput = {
  id?: string
  note?: string
  currency?: string
}

const money = (amountMinor: number, currency = 'PLN') =>
  Money.create({
    amountMinor,
    currency
  })

const expectMoney = (actual: Money, amountMinor: number, currency = 'PLN') => {
  expect(actual.toSnapshot()).toEqual(money(amountMinor, currency).toSnapshot())
}

const expectParticipantEvent = (
  event: CampParticipantEvent,
  expectedEvent: new (participant: CampParticipantSnapshot) => object,
  eventName: string,
  participant: CampParticipant
) => {
  expect(event).toBeInstanceOf(expectedEvent)
  expect(event.eventName).toBe(eventName)
  expect(event.payload).toEqual(participant.toSnapshot())
}

const givenClubParticipantJoinsCamp = () =>
  CampParticipant.register(
    {
      campId: CAMP_ID,
      person: {
        type: 'club',
        memberId: MEMBER_ID
      },
      totalAmountDue: money(CAMP_PRICE)
    },
    PARTICIPANT_ID
  )

const givenRegisteredClubParticipant = (): CampParticipant => {
  const [participant] = givenClubParticipantJoinsCamp()

  return participant
}

const whenParticipantPays = (
  participant: CampParticipant,
  amountMinor: number,
  input: TransactionStoryInput = {}
) => {
  const [paidParticipant, event] = participant.registerPayment({
    id: input.id ?? 'payment-1',
    amount: money(amountMinor, input.currency),
    note: input.note
  })

  return {
    paidParticipant,
    event
  }
}

const whenParticipantResigns = (
  participant: CampParticipant,
  deposit?: {
    id?: string
    amountMinor: number
    note?: string
    currency?: string
  }
) => {
  const [resignedParticipant, event] = participant.resign(
    deposit
      ? {
          id: deposit.id ?? 'deposit-1',
          amount: money(deposit.amountMinor, deposit.currency),
          note: deposit.note
        }
      : undefined
  )

  return {
    resignedParticipant,
    event
  }
}

const whenParticipantReceivesRefund = (
  participant: CampParticipant,
  amountMinor: number,
  input: TransactionStoryInput = {}
) => {
  const [refundedParticipant, event] = participant.registerRefund({
    id: input.id ?? 'refund-1',
    amount: money(amountMinor, input.currency),
    note: input.note
  })

  return {
    refundedParticipant,
    event
  }
}

const givenFullyPaidParticipant = (): CampParticipant => {
  const participant = givenRegisteredClubParticipant()
  const { paidParticipant } = whenParticipantPays(participant, CAMP_PRICE, {
    note: 'Paid in full'
  })

  return paidParticipant
}

describe('CampParticipant', () => {
  describe('registration stories', () => {
    it('a club member joins a camp and the participant is ready to be paid', () => {
      const totalAmountDue = money(CAMP_PRICE)
      const storyStartedAt = new Date()

      const [participant, event] = CampParticipant.register(
        {
          campId: `  ${CAMP_ID}  `,
          person: {
            type: 'club',
            memberId: `  ${MEMBER_ID}  `
          },
          totalAmountDue
        },
        PARTICIPANT_ID
      )

      const storyFinishedAt = new Date()

      expect(participant.id).toBe(PARTICIPANT_ID)
      expect(participant.campId).toBe(CAMP_ID)
      expect(participant.person).toEqual({
        type: 'club',
        memberId: MEMBER_ID
      })
      expect(participant.status).toBe('REGISTERED')
      expect(participant.totalAmountDue.toSnapshot()).toEqual(
        totalAmountDue.toSnapshot()
      )
      expect(participant.discounts).toEqual([])
      expect(participant.financialTransactions).toEqual([])
      expect(participant.addedAt.getTime()).toBeGreaterThanOrEqual(
        storyStartedAt.getTime()
      )
      expect(participant.addedAt.getTime()).toBeLessThanOrEqual(
        storyFinishedAt.getTime()
      )
      expect(participant.updatedAt).toEqual(participant.addedAt)
      expectParticipantEvent(
        event,
        CampParticipantRegisteredDomainEvent,
        'camp.participant.registered',
        participant
      )
    })

    it('an external guest joins a camp and their name is standardized', () => {
      const [participant] = CampParticipant.register(
        {
          campId: CAMP_ID,
          person: {
            type: 'external',
            firstName: '  Anna  ',
            lastName: '  Kowalska-Nowak  '
          },
          totalAmountDue: money(CAMP_PRICE)
        },
        PARTICIPANT_ID
      )

      expect(participant.person).toEqual({
        type: 'external',
        firstName: 'anna',
        lastName: 'kowalska-nowak'
      })
    })

    it('a participant restored from storage keeps the original story data isolated', () => {
      const addedAt = new Date('2026-03-01T10:00:00Z')
      const updatedAt = new Date('2026-03-02T10:00:00Z')
      const discountCreatedAt = new Date('2026-03-01T11:00:00Z')
      const paymentCreatedAt = new Date('2026-03-01T12:00:00Z')
      const depositCreatedAt = new Date('2026-03-01T12:30:00Z')
      const refundCreatedAt = new Date('2026-03-01T13:00:00Z')

      const participant = CampParticipant.rehydrate({
        id: PARTICIPANT_ID,
        campId: CAMP_ID,
        person: {
          type: 'club',
          memberId: MEMBER_ID
        },
        status: 'RESIGNED',
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
            type: 'non_refundable_deposit',
            id: 'deposit-1',
            amount: money(100_00),
            note: 'Retained deposit',
            createdAt: depositCreatedAt
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
      depositCreatedAt.setUTCFullYear(2044)
      refundCreatedAt.setUTCFullYear(2045)

      expect(participant.toSnapshot()).toEqual({
        id: PARTICIPANT_ID,
        campId: CAMP_ID,
        person: {
          type: 'club',
          memberId: MEMBER_ID
        },
        status: 'RESIGNED',
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
            type: 'non_refundable_deposit',
            id: 'deposit-1',
            amount: money(100_00),
            note: 'Retained deposit',
            createdAt: new Date('2026-03-01T12:30:00Z')
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
  })

  describe('discount stories', () => {
    it('a discount lowers the camp price without changing the earlier participant', () => {
      const participant = givenRegisteredClubParticipant()
      const storyStartedAt = new Date()

      const [discountedParticipant, event] = participant.applyDiscount({
        id: '  discount-1  ',
        amount: money(200_00),
        reason: '  Sibling discount  '
      })

      const storyFinishedAt = new Date()

      expect(discountedParticipant).not.toBe(participant)
      expectMoney(participant.totalAmountDue, CAMP_PRICE)
      expect(participant.discounts).toEqual([])
      expectMoney(discountedParticipant.totalAmountDue, 1000_00)
      expect(discountedParticipant.status).toBe('REGISTERED')
      expect(discountedParticipant.discounts).toHaveLength(1)
      expect(discountedParticipant.discounts[0]).toMatchObject({
        id: 'discount-1',
        amount: money(200_00),
        reason: 'Sibling discount'
      })
      expect(
        discountedParticipant.discounts[0].createdAt.getTime()
      ).toBeGreaterThanOrEqual(storyStartedAt.getTime())
      expect(discountedParticipant.updatedAt.getTime()).toBeLessThanOrEqual(
        storyFinishedAt.getTime()
      )
      expect(discountedParticipant.updatedAt).toEqual(
        discountedParticipant.discounts[0].createdAt
      )
      expectParticipantEvent(
        event,
        CampParticipantDiscountAppliedDomainEvent,
        'camp.participant.discount_applied',
        discountedParticipant
      )
    })

    it('a late discount leaves a fully paid participant fully paid when money is owed back', () => {
      const participant = givenRegisteredClubParticipant()
      const { paidParticipant: fullyPaidParticipant } = whenParticipantPays(
        participant,
        CAMP_PRICE
      )

      const [discountedParticipant] = fullyPaidParticipant.applyDiscount({
        id: 'discount-1',
        amount: money(200_00),
        reason: 'Late discount'
      })

      expect(participant.status).toBe('REGISTERED')
      expect(fullyPaidParticipant.status).toBe('FULLY_PAID')
      expect(discountedParticipant.status).toBe('FULLY_PAID')
      expectMoney(discountedParticipant.totalAmountDue, 1000_00)
      expect(discountedParticipant.financialTransactions).toHaveLength(1)
    })
  })

  describe('payment stories', () => {
    it('installments move the participant from registered to fully paid', () => {
      const participant = givenRegisteredClubParticipant()

      const { paidParticipant: partlyPaidParticipant } = whenParticipantPays(
        participant,
        500_00,
        {
          id: 'payment-1',
          note: 'First installment'
        }
      )
      const { paidParticipant: fullyPaidParticipant, event } =
        whenParticipantPays(partlyPaidParticipant, 700_00, {
          id: 'payment-2',
          note: 'Final installment'
        })

      expect(partlyPaidParticipant).not.toBe(participant)
      expect(fullyPaidParticipant).not.toBe(partlyPaidParticipant)
      expect(participant.status).toBe('REGISTERED')
      expect(participant.financialTransactions).toEqual([])
      expect(partlyPaidParticipant.status).toBe('REGISTERED')
      expect(partlyPaidParticipant.financialTransactions).toHaveLength(1)
      expect(partlyPaidParticipant.financialTransactions[0]).toMatchObject({
        type: 'payment',
        id: 'payment-1',
        amount: money(500_00),
        note: 'First installment'
      })
      expect(fullyPaidParticipant.status).toBe('FULLY_PAID')
      expect(fullyPaidParticipant.financialTransactions).toHaveLength(2)
      expectParticipantEvent(
        event,
        CampParticipantPaymentRegisteredDomainEvent,
        'camp.participant.payment_registered',
        fullyPaidParticipant
      )
    })
  })

  describe('resignation stories', () => {
    it('a participant can resign without creating a refund transaction', () => {
      const participant = givenRegisteredClubParticipant()
      const storyStartedAt = new Date()

      const { resignedParticipant, event } = whenParticipantResigns(participant)

      const storyFinishedAt = new Date()

      expect(resignedParticipant).not.toBe(participant)
      expect(participant.status).toBe('REGISTERED')
      expect(resignedParticipant.status).toBe('RESIGNED')
      expect(resignedParticipant.financialTransactions).toEqual([])
      expect(resignedParticipant.updatedAt.getTime()).toBeGreaterThanOrEqual(
        storyStartedAt.getTime()
      )
      expect(resignedParticipant.updatedAt.getTime()).toBeLessThanOrEqual(
        storyFinishedAt.getTime()
      )
      expectParticipantEvent(
        event,
        CampParticipantResignedDomainEvent,
        'camp.participant.resigned',
        resignedParticipant
      )
    })

    it('a paid participant can resign while the camp keeps a deposit', () => {
      const participant = givenRegisteredClubParticipant()
      const { paidParticipant } = whenParticipantPays(participant, 500_00, {
        note: 'Deposit payment'
      })
      const storyStartedAt = new Date()

      const { resignedParticipant, event } = whenParticipantResigns(
        paidParticipant,
        {
          id: '  deposit-1  ',
          amountMinor: 200_00,
          note: '  Retained deposit  '
        }
      )

      const storyFinishedAt = new Date()

      expect(resignedParticipant).not.toBe(paidParticipant)
      expect(paidParticipant.status).toBe('REGISTERED')
      expect(paidParticipant.financialTransactions).toHaveLength(1)
      expect(resignedParticipant.status).toBe('RESIGNED')
      expect(resignedParticipant.financialTransactions).toHaveLength(2)
      expect(resignedParticipant.financialTransactions[1]).toMatchObject({
        type: 'non_refundable_deposit',
        id: 'deposit-1',
        amount: money(200_00),
        note: 'Retained deposit'
      })
      expect(
        resignedParticipant.financialTransactions[1].createdAt.getTime()
      ).toBeGreaterThanOrEqual(storyStartedAt.getTime())
      expect(resignedParticipant.updatedAt.getTime()).toBeLessThanOrEqual(
        storyFinishedAt.getTime()
      )
      expect(resignedParticipant.updatedAt).toEqual(
        resignedParticipant.financialTransactions[1].createdAt
      )
      expectParticipantEvent(
        event,
        CampParticipantResignedDomainEvent,
        'camp.participant.resigned',
        resignedParticipant
      )
    })
  })

  describe('refund stories', () => {
    it('refunds are recorded after resignation and the participant stays resigned while money remains', () => {
      const fullyPaidParticipant = givenFullyPaidParticipant()
      const { resignedParticipant } =
        whenParticipantResigns(fullyPaidParticipant)

      const { refundedParticipant, event } = whenParticipantReceivesRefund(
        resignedParticipant,
        200_00,
        {
          id: '  refund-1  ',
          note: '  Partial refund  '
        }
      )

      expect(refundedParticipant).not.toBe(resignedParticipant)
      expect(fullyPaidParticipant.status).toBe('FULLY_PAID')
      expect(resignedParticipant.status).toBe('RESIGNED')
      expect(resignedParticipant.financialTransactions).toHaveLength(1)
      expect(refundedParticipant.status).toBe('RESIGNED')
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
      expectParticipantEvent(
        event,
        CampParticipantRefundRegisteredDomainEvent,
        'camp.participant.refund_registered',
        refundedParticipant
      )
    })

    it('the final refund closes the participant story as refunded', () => {
      const fullyPaidParticipant = givenFullyPaidParticipant()
      const { resignedParticipant } = whenParticipantResigns(
        fullyPaidParticipant,
        {
          amountMinor: 200_00
        }
      )

      const { refundedParticipant } = whenParticipantReceivesRefund(
        resignedParticipant,
        1000_00
      )

      expect(refundedParticipant.status).toBe('REFUNDED')
      expect(refundedParticipant.financialTransactions).toHaveLength(3)
    })
  })

  describe('immutability stories', () => {
    it('outside changes cannot rewrite person, dates, money, discounts, or transactions', () => {
      const person = {
        type: 'external' as const,
        firstName: 'Anna',
        lastName: 'Kowalska'
      }
      const [participant] = CampParticipant.register(
        {
          campId: CAMP_ID,
          person,
          totalAmountDue: money(CAMP_PRICE)
        },
        PARTICIPANT_ID
      )
      const [discountedParticipant] = participant.applyDiscount({
        id: 'discount-1',
        amount: money(200_00)
      })
      const { paidParticipant } = whenParticipantPays(
        discountedParticipant,
        300_00
      )
      const { resignedParticipant } = whenParticipantResigns(paidParticipant, {
        id: 'deposit-1',
        amountMinor: 100_00
      })

      person.firstName = 'Changed'

      const exposedPerson = resignedParticipant.person
      const exposedDiscounts = resignedParticipant.discounts
      const exposedTransactions = resignedParticipant.financialTransactions
      const exposedSnapshot = resignedParticipant.toSnapshot()

      if (exposedPerson.type === 'external') {
        exposedPerson.firstName = 'Changed again'
      }

      exposedDiscounts[0].reason = 'Changed reason'
      exposedDiscounts[0].createdAt.setUTCFullYear(2040)
      exposedTransactions[0].note = 'Changed note'
      exposedTransactions[0].createdAt.setUTCFullYear(2041)
      exposedTransactions[1].note = 'Changed deposit note'
      exposedTransactions[1].createdAt.setUTCFullYear(2042)
      exposedSnapshot.addedAt.setUTCFullYear(2043)
      exposedSnapshot.updatedAt.setUTCFullYear(2044)

      expect(resignedParticipant.person).toEqual({
        type: 'external',
        firstName: 'anna',
        lastName: 'kowalska'
      })
      expectMoney(resignedParticipant.totalAmountDue, 1000_00)
      expect(resignedParticipant.discounts[0].reason).toBe('')
      expect(resignedParticipant.discounts[0].createdAt).not.toEqual(
        exposedDiscounts[0].createdAt
      )
      expect(resignedParticipant.financialTransactions[0].note).toBe('')
      expect(
        resignedParticipant.financialTransactions[0].createdAt
      ).not.toEqual(exposedTransactions[0].createdAt)
      expect(resignedParticipant.financialTransactions[1].note).toBe('')
      expect(
        resignedParticipant.financialTransactions[1].createdAt
      ).not.toEqual(exposedTransactions[1].createdAt)
      expect(resignedParticipant.addedAt).not.toEqual(exposedSnapshot.addedAt)
      expect(resignedParticipant.updatedAt).not.toEqual(
        exposedSnapshot.updatedAt
      )
    })
  })

  describe('rejection stories', () => {
    it('a participant cannot be registered without valid identity data', () => {
      expect(() =>
        CampParticipant.register(
          {
            campId: '  ',
            person: {
              type: 'club',
              memberId: MEMBER_ID
            },
            totalAmountDue: money(CAMP_PRICE)
          },
          PARTICIPANT_ID
        )
      ).toThrow(InvalidCampParticipantCampIdError)

      expect(() =>
        CampParticipant.register(
          {
            campId: CAMP_ID,
            person: {
              type: 'club',
              memberId: '  '
            },
            totalAmountDue: money(CAMP_PRICE)
          },
          PARTICIPANT_ID
        )
      ).toThrow(InvalidCampParticipantMemberIdError)

      expect(() =>
        CampParticipant.register(
          {
            campId: CAMP_ID,
            person: {
              type: 'external',
              firstName: 'Anna',
              lastName: ''
            },
            totalAmountDue: money(CAMP_PRICE)
          },
          PARTICIPANT_ID
        )
      ).toThrow(InvalidExternalCampParticipantNameError)

      expect(() =>
        CampParticipant.register(
          {
            campId: CAMP_ID,
            person: {
              type: 'external',
              firstName: 'Anna!',
              lastName: 'Kowalska'
            },
            totalAmountDue: money(CAMP_PRICE)
          },
          PARTICIPANT_ID
        )
      ).toThrow(InvalidExternalCampParticipantNameError)
    })

    it('a participant cannot record invalid financial details', () => {
      const participant = givenRegisteredClubParticipant()

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

      const { paidParticipant } = whenParticipantPays(participant, 100_00, {
        id: 'payment-0'
      })
      const { resignedParticipant } = whenParticipantResigns(paidParticipant)

      expect(() =>
        whenParticipantReceivesRefund(resignedParticipant, 100_00, {
          id: 'refund-1',
          currency: 'EUR'
        })
      ).toThrow(CampParticipantCurrencyMismatchError)
    })

    it('a discount cannot exceed what the participant still owes', () => {
      const participant = givenRegisteredClubParticipant()

      expect(() =>
        participant.applyDiscount({
          id: 'discount-1',
          amount: money(1300_00)
        })
      ).toThrow(CampParticipantDiscountExceedsAmountDueError)
    })

    it('a participant cannot take lifecycle actions from the wrong status', () => {
      const participant = givenRegisteredClubParticipant()

      expect(() => whenParticipantReceivesRefund(participant, 100_00)).toThrow(
        CampParticipantRefundNotAllowedError
      )

      const { resignedParticipant } = whenParticipantResigns(participant)

      expect(() => whenParticipantPays(resignedParticipant, 100_00)).toThrow(
        CampParticipantPaymentNotAllowedError
      )
      expect(() =>
        resignedParticipant.applyDiscount({
          id: 'discount-1',
          amount: money(100_00)
        })
      ).toThrow(CampParticipantDiscountNotAllowedError)
      expect(() => resignedParticipant.resign()).toThrow(
        CampParticipantResignationNotAllowedError
      )
    })

    it('a retained deposit or refund cannot exceed the available paid balance', () => {
      const participant = givenRegisteredClubParticipant()

      expect(() =>
        whenParticipantResigns(participant, {
          amountMinor: 100_00
        })
      ).toThrow(CampParticipantNonRefundableDepositExceedsPaidBalanceError)

      const { paidParticipant } = whenParticipantPays(participant, 500_00)
      const { resignedParticipant } = whenParticipantResigns(paidParticipant, {
        amountMinor: 200_00
      })

      expect(() =>
        whenParticipantReceivesRefund(resignedParticipant, 301_00)
      ).toThrow(CampParticipantRefundExceedsRefundableBalanceError)
    })

    it('a fully refunded participant cannot receive another refund', () => {
      const participant = givenRegisteredClubParticipant()
      const { paidParticipant } = whenParticipantPays(participant, 500_00)
      const { resignedParticipant } = whenParticipantResigns(paidParticipant)
      const { refundedParticipant } = whenParticipantReceivesRefund(
        resignedParticipant,
        500_00
      )

      expect(refundedParticipant.status).toBe('REFUNDED')
      expect(() =>
        whenParticipantReceivesRefund(refundedParticipant, 100_00, {
          id: 'refund-2'
        })
      ).toThrow(CampParticipantRefundNotAllowedError)
    })
  })
})
