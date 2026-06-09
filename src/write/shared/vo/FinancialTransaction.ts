import { copyDate } from '@/write/shared/DateUtils'
import { Money } from '@/write/shared/vo/Money'

type FinancialTransactionFields<TType extends 'payment' | 'refund'> = {
  type: TType
  id: string
  amount: Money
  note: string
  createdAt: Date
}

type NotedFinancialTransactionInputFields = {
  id: string
  amount: Money
  note?: string
}

type DiscountFields = {
  id: string
  amount: Money
  reason: string
  createdAt: Date
}

type DiscountInputFields = {
  id: string
  amount: Money
  reason?: string
}

export type PaymentInput = NotedFinancialTransactionInputFields

export type Payment = FinancialTransactionFields<'payment'>

export type RefundInput = NotedFinancialTransactionInputFields

// todo not yet sure if we should allow for negative values in refunds
export type Refund = FinancialTransactionFields<'refund'>

export type Discount = DiscountFields

export type DiscountInput = DiscountInputFields

export type FinancialTransaction = Payment | Refund

export type FinancialTransactionInput = PaymentInput | RefundInput

const assertValidTransactionId = (transactionId: string): string => {
  const normalizedTransactionId = transactionId.trim()

  if (normalizedTransactionId.length === 0) {
    throw new InvalidFinancialTransactionIdError(transactionId)
  }

  return normalizedTransactionId
}

const assertPositiveAmount = (amount: Money): Money => {
  if (amount.amountMinor <= 0) {
    throw new InvalidFinancialTransactionAmountError(amount)
  }

  return Money.create(amount.toSnapshot())
}

const trimOptionalText = (value?: string): string => (value ?? '').trim()

export const createDiscount = (
  input: DiscountInput,
  createdAt: Date = new Date()
): Discount => ({
  id: assertValidTransactionId(input.id),
  amount: assertPositiveAmount(input.amount),
  reason: trimOptionalText(input.reason),
  createdAt: copyDate(createdAt)
})

export const createPayment = (
  input: PaymentInput,
  createdAt: Date = new Date()
): Payment => ({
  type: 'payment',
  id: assertValidTransactionId(input.id),
  amount: assertPositiveAmount(input.amount),
  note: trimOptionalText(input.note),
  createdAt: copyDate(createdAt)
})

export const createRefund = (
  input: RefundInput,
  createdAt: Date = new Date()
): Refund => ({
  type: 'refund',
  id: assertValidTransactionId(input.id),
  amount: assertPositiveAmount(input.amount),
  note: trimOptionalText(input.note),
  createdAt: copyDate(createdAt)
})

export const copyDiscount = (discount: Discount): Discount => ({
  id: discount.id,
  amount: Money.create(discount.amount.toSnapshot()),
  reason: discount.reason,
  createdAt: copyDate(discount.createdAt)
})

export const copyFinancialTransaction = (
  transaction: FinancialTransaction
): FinancialTransaction => ({
  type: transaction.type,
  id: transaction.id,
  amount: Money.create(transaction.amount.toSnapshot()),
  note: transaction.note,
  createdAt: copyDate(transaction.createdAt)
})

export class InvalidFinancialTransactionIdError extends Error {
  public constructor(transactionId: string) {
    super(`Financial transaction id is invalid: ${transactionId}`)
    this.name = 'InvalidFinancialTransactionIdError'
  }
}

export class InvalidFinancialTransactionAmountError extends Error {
  public constructor(amount: Money) {
    super(
      `Financial transaction amount must be positive: ${amount.amountMinor} ${amount.currency}`
    )
    this.name = 'InvalidFinancialTransactionAmountError'
  }
}
