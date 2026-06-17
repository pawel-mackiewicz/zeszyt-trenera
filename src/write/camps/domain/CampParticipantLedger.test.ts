import { describe, expect, it } from 'vitest'

import { CampParticipantLedger } from '@/write/camps/domain/CampParticipantLedger'
import {
  createNonRefundableDeposit,
  createNonRefundableDepositReversal,
  createPayment,
  createRefund
} from '@/write/shared/vo/FinancialTransaction'
import { Money } from '@/write/shared/vo/Money'

const money = (amountMinor: number, currency = 'PLN') =>
  Money.create({
    amountMinor,
    currency
  })

const payment = (amountMinor: number, id = 'payment-1') =>
  createPayment({
    id,
    amount: money(amountMinor)
  })

const refund = (amountMinor: number, id = 'refund-1') =>
  createRefund({
    id,
    amount: money(amountMinor)
  })

const retainedDeposit = (amountMinor: number, id = 'deposit-1') =>
  createNonRefundableDeposit({
    id,
    amount: money(amountMinor)
  })

const depositReversal = (
  amountMinor: number,
  reversedTransactionId = 'deposit-1',
  id = 'deposit-reversal-1'
) =>
  createNonRefundableDepositReversal({
    id,
    reversedTransactionId,
    amount: money(amountMinor)
  })

const expectBalance = (ledger: CampParticipantLedger, amountMinor: number) => {
  expect(ledger.balanceMinor()).toBe(amountMinor)
}

describe('CampParticipantLedger', () => {
  it('counts payments as available participant balance', () => {
    const ledger = CampParticipantLedger.from([payment(500_00)])

    expectBalance(ledger, 500_00)
  })

  it('subtracts refunds from available participant balance', () => {
    const ledger = CampParticipantLedger.from([payment(500_00), refund(200_00)])

    expectBalance(ledger, 300_00)
  })

  it('subtracts retained deposits from available participant balance', () => {
    const ledger = CampParticipantLedger.from([
      payment(500_00),
      retainedDeposit(200_00)
    ])

    expectBalance(ledger, 300_00)
  })

  it('adds deposit reversals back to available participant balance', () => {
    const ledger = CampParticipantLedger.from([
      payment(500_00),
      retainedDeposit(200_00),
      depositReversal(200_00)
    ])

    expectBalance(ledger, 500_00)
  })

  it('never asks the participant to pay less than zero after overpayment', () => {
    const ledger = CampParticipantLedger.from([payment(1_500_00)])

    expect(ledger.remainingAmountToPay(money(1_200_00)).toSnapshot()).toEqual(
      money(0).toSnapshot()
    )
  })

  it('returns only retained deposits that were not already reversed', () => {
    const ledger = CampParticipantLedger.from([
      retainedDeposit(100_00, 'deposit-1'),
      retainedDeposit(200_00, 'deposit-2'),
      depositReversal(100_00, 'deposit-1')
    ])

    expect(ledger.unreversedNonRefundableDeposits()).toMatchObject([
      {
        type: 'non_refundable_deposit',
        id: 'deposit-2',
        amount: money(200_00)
      }
    ])
  })
})
