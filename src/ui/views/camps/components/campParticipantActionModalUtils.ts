import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type CampParticipantActionSubject = {
  campName: string
  participantDisplayName: string
}

export type CampParticipantDiscountSubmit = {
  amount: MoneySnapshot
  reason?: string
}

export type CampParticipantPaymentSubmit = {
  amount: MoneySnapshot
  note?: string
}

export type CampParticipantResignationSubmit = {
  nonRefundableDepositValue?: MoneySnapshot
  refundedValue?: MoneySnapshot
}

export function parsePositiveMoney(
  value: string,
  currency: string
): MoneySnapshot | null {
  const normalizedValue = value.trim().replace(',', '.')
  const amount = Number(normalizedValue)
  const amountMinor = Math.round(amount * 100)

  if (!Number.isFinite(amount) || amountMinor <= 0) {
    return null
  }

  return {
    amountMinor,
    currency
  }
}

export function parseNonNegativeMoney(
  value: string,
  currency: string
): MoneySnapshot | null {
  const normalizedValue = value.trim().replace(',', '.')

  if (normalizedValue.length === 0) {
    return null
  }

  const amount = Number(normalizedValue)
  const amountMinor = Math.round(amount * 100)

  if (!Number.isFinite(amount) || amountMinor < 0) {
    return null
  }

  return {
    amountMinor,
    currency
  }
}

export function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

export function formatMoneyInput(money: MoneySnapshot): string {
  return (money.amountMinor / 100).toFixed(2).replace('.', ',')
}

export function formatMoney(money: MoneySnapshot): string {
  return `${formatMoneyInput(money)} ${money.currency}`
}
