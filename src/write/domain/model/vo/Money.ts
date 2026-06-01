export type MoneySnapshot = {
  amountMinor: number
  currency: string
}

export class Money {
  private constructor(
    public readonly amountMinor: number, // stored as cents/grosze
    public readonly currency: string
  ) {}

  public static create(input: MoneySnapshot): Money {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
      throw new InvalidMoneyAmountMinorError(input.amountMinor)
    }

    if (input.currency.trim().length === 0) {
      throw new InvalidMoneyCurrencyError(input.currency)
    }

    return new Money(input.amountMinor, input.currency)
  }

  public toSnapshot(): MoneySnapshot {
    return {
      amountMinor: this.amountMinor,
      currency: this.currency
    }
  }

  public toString(): string {
    const amountMajor = (this.amountMinor / 100).toFixed(2).replace('.', ',')

    return `${amountMajor} ${this.currency}`
  }
}

export class InvalidMoneyAmountMinorError extends Error {
  public constructor(amountMinor: number) {
    super(`Money amountMinor must be a non-negative integer: ${amountMinor}`)
    this.name = 'InvalidMoneyAmountMinorError'
  }
}

export class InvalidMoneyCurrencyError extends Error {
  public constructor(currency: string) {
    super(`Money currency must be a non-empty string: ${currency}`)
    this.name = 'InvalidMoneyCurrencyError'
  }
}
