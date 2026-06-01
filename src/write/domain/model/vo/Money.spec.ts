import { describe, expect, it } from 'vitest'

import {
  InvalidMoneyAmountMinorError,
  InvalidMoneyCurrencyError,
  Money
} from '@/write/domain/model/vo/Money'

describe('Money', () => {
  it('creates money with a non-negative minor-unit amount and currency', () => {
    const money = Money.create({
      amountMinor: 16_000,
      currency: 'PLN'
    })

    expect(money.toSnapshot()).toEqual({
      amountMinor: 16_000,
      currency: 'PLN'
    })
  })

  it('allows zero amount', () => {
    expect(
      Money.create({
        amountMinor: 0,
        currency: 'PLN'
      }).amountMinor
    ).toBe(0)
  })

  it('returns a string representation', () => {
    expect(
      Money.create({
        amountMinor: 16_000,
        currency: 'PLN'
      }).toString()
    ).toBe('160,00 PLN')
  })

  it('rejects negative and fractional minor-unit amounts', () => {
    expect(() =>
      Money.create({
        amountMinor: -1,
        currency: 'PLN'
      })
    ).toThrow(InvalidMoneyAmountMinorError)

    expect(() =>
      Money.create({
        amountMinor: 10.5,
        currency: 'PLN'
      })
    ).toThrow(InvalidMoneyAmountMinorError)
  })

  it('rejects empty currency', () => {
    expect(() =>
      Money.create({
        amountMinor: 16_000,
        currency: ' '
      })
    ).toThrow(InvalidMoneyCurrencyError)
  })
})
