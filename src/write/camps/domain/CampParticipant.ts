import { copyDate } from '@/write/shared/DateUtils'
import { DomainEvent } from '@/write/shared/events/DomainEvent'
import {
  isStandardizableName,
  standardizeName
} from '@/write/shared/NameStandardization'
import type {
  Discount,
  DiscountInput,
  FinancialTransaction,
  PaymentInput,
  RefundInput
} from '@/write/shared/vo/FinancialTransaction'
import {
  copyDiscount,
  copyFinancialTransaction,
  createDiscount,
  createPayment,
  createRefund
} from '@/write/shared/vo/FinancialTransaction'
import { Money } from '@/write/shared/vo/Money'

export type CampParticipantStatus =
  | 'REGISTERED'
  | 'FULLY_PAID'
  | 'RESIGNED'
  | 'REFUNDED'

export type ClubCampParticipant = {
  type: 'club'
  memberId: string
}

export type ExternalCampParticipant = {
  type: 'external'
  firstName: string
  lastName: string
}

export type CampParticipantPerson =
  | ClubCampParticipant
  | ExternalCampParticipant

export type CampParticipantPersonSnapshot = CampParticipantPerson

export type RegisterCampParticipantInput = {
  campId: string
  person: CampParticipantPerson
  totalAmountDue: Money
}

export type CampParticipantSnapshot = {
  id: string
  campId: string
  person: CampParticipantPersonSnapshot
  status: CampParticipantStatus
  totalAmountDue: Money
  discounts: Discount[]
  financialTransactions: FinancialTransaction[]
  addedAt: Date
  updatedAt: Date
}

type CampParticipantStateInput = {
  campId: string
  person: CampParticipantPerson
  status: CampParticipantStatus
  totalAmountDue: Money
  discounts: Discount[]
  financialTransactions: FinancialTransaction[]
  updatedAt?: Date
}

const assertValidCampId = (campId: string): string => {
  const normalizedCampId = campId.trim()

  if (normalizedCampId.length === 0) {
    throw new InvalidCampParticipantCampIdError(campId)
  }

  return normalizedCampId
}

const assertValidPerson = (
  person: CampParticipantPerson
): CampParticipantPerson => {
  if (person.type === 'club') {
    const memberId = person.memberId.trim()

    if (memberId.length === 0) {
      throw new InvalidCampParticipantMemberIdError(person.memberId)
    }

    return {
      type: 'club',
      memberId
    }
  }

  if (
    !isStandardizableName(person.firstName) ||
    !isStandardizableName(person.lastName)
  ) {
    throw new InvalidExternalCampParticipantNameError(
      person.firstName,
      person.lastName
    )
  }

  return {
    type: 'external',
    firstName: standardizeName(person.firstName),
    lastName: standardizeName(person.lastName)
  }
}

const copyPerson = (person: CampParticipantPerson): CampParticipantPerson => {
  if (person.type === 'club') {
    return {
      type: 'club',
      memberId: person.memberId
    }
  }

  return {
    type: 'external',
    firstName: person.firstName,
    lastName: person.lastName
  }
}

const assertMatchingCurrency = (expected: Money, provided: Money): void => {
  if (expected.currency !== provided.currency) {
    throw new CampParticipantCurrencyMismatchError(
      expected.currency,
      provided.currency
    )
  }
}

const createMoneyInSameCurrency = (money: Money, amountMinor: number): Money =>
  Money.create({
    amountMinor,
    currency: money.currency
  })

/**
 * Returns the net amount paid in minor units.
 * Payments increase the participant balance; refunds decrease it.
 */
const financialBalanceMinor = (transactions: FinancialTransaction[]): number =>
  transactions.reduce((sum, transaction) => {
    if (transaction.type === 'payment') {
      return sum + transaction.amount.amountMinor
    }

    return sum - transaction.amount.amountMinor
  }, 0)

const resolvePaymentStatus = (
  totalAmountDue: Money,
  financialBalanceAmountMinor: number
): CampParticipantStatus =>
  financialBalanceAmountMinor >= totalAmountDue.amountMinor
    ? 'FULLY_PAID'
    : 'REGISTERED'

export class CampParticipant {
  public readonly id: string
  public readonly campId: string

  private _person: CampParticipantPerson
  private _status: CampParticipantStatus
  private _totalAmountDue: Money
  private _discounts: Discount[]
  private _financialTransactions: FinancialTransaction[]
  private _addedAt: Date
  private _updatedAt: Date

  private constructor(
    input: CampParticipantStateInput,
    id: string,
    addedAt: Date = new Date()
  ) {
    this.id = id
    this.campId = input.campId
    this._person = copyPerson(input.person)
    this._status = input.status
    this._totalAmountDue = Money.create(input.totalAmountDue.toSnapshot())
    this._discounts = input.discounts.map(copyDiscount)
    this._financialTransactions = input.financialTransactions.map(
      copyFinancialTransaction
    )
    this._addedAt = copyDate(addedAt)
    this._updatedAt = copyDate(input.updatedAt ?? addedAt)
  }

  public static register(
    input: RegisterCampParticipantInput,
    id: string
  ): [CampParticipant, CampParticipantRegisteredDomainEvent] {
    const addedAt = new Date()
    const totalAmountDue = Money.create(input.totalAmountDue.toSnapshot())
    const campParticipant = new CampParticipant(
      {
        campId: assertValidCampId(input.campId),
        person: assertValidPerson(input.person),
        status: resolvePaymentStatus(totalAmountDue, 0),
        totalAmountDue,
        discounts: [],
        financialTransactions: [],
        updatedAt: addedAt
      },
      id,
      addedAt
    )
    const event = new CampParticipantRegisteredDomainEvent(
      campParticipant.toSnapshot()
    )

    return [campParticipant, event]
  }

  public static rehydrate(snapshot: CampParticipantSnapshot): CampParticipant {
    return new CampParticipant(
      {
        campId: snapshot.campId,
        person: copyPerson(snapshot.person),
        status: snapshot.status,
        totalAmountDue: Money.create(snapshot.totalAmountDue.toSnapshot()),
        discounts: snapshot.discounts.map(copyDiscount),
        financialTransactions: snapshot.financialTransactions.map(
          copyFinancialTransaction
        ),
        updatedAt: snapshot.updatedAt
      },
      snapshot.id,
      snapshot.addedAt
    )
  }

  public applyDiscount(
    input: DiscountInput
  ): [CampParticipant, CampParticipantDiscountAppliedDomainEvent] {
    const discount = createDiscount(input)

    assertMatchingCurrency(this._totalAmountDue, discount.amount)

    const totalAmountDueMinor =
      this._totalAmountDue.amountMinor - discount.amount.amountMinor

    if (totalAmountDueMinor < 0) {
      throw new CampParticipantDiscountExceedsAmountDueError()
    }

    const totalAmountDue = createMoneyInSameCurrency(
      this._totalAmountDue,
      totalAmountDueMinor
    )

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: resolvePaymentStatus(
          totalAmountDue,
          financialBalanceMinor(this._financialTransactions)
        ),
        totalAmountDue,
        discounts: [...this._discounts, discount],
        financialTransactions: this._financialTransactions,
        updatedAt: discount.createdAt
      },
      this.id,
      this.addedAt
    )

    const event = new CampParticipantDiscountAppliedDomainEvent(
      updatedCampParticipant.toSnapshot()
    )

    return [updatedCampParticipant, event]
  }

  public registerPayment(
    input: PaymentInput
  ): [CampParticipant, CampParticipantPaymentRegisteredDomainEvent] {
    const payment = createPayment(input)

    assertMatchingCurrency(this._totalAmountDue, payment.amount)

    const financialTransactions = [...this._financialTransactions, payment]

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: resolvePaymentStatus(
          this._totalAmountDue,
          financialBalanceMinor(financialTransactions)
        ),
        totalAmountDue: this._totalAmountDue,
        discounts: this._discounts,
        financialTransactions,
        updatedAt: payment.createdAt
      },
      this.id,
      this.addedAt
    )

    const event = new CampParticipantPaymentRegisteredDomainEvent(
      updatedCampParticipant.toSnapshot()
    )

    return [updatedCampParticipant, event]
  }

  public registerRefund(
    input: RefundInput
  ): [CampParticipant, CampParticipantRefundRegisteredDomainEvent] {
    const refund = createRefund(input)

    assertMatchingCurrency(this._totalAmountDue, refund.amount)

    const financialTransactions = [...this._financialTransactions, refund]

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: resolvePaymentStatus(
          this._totalAmountDue,
          financialBalanceMinor(financialTransactions)
        ),
        totalAmountDue: this._totalAmountDue,
        discounts: this._discounts,
        financialTransactions,
        updatedAt: refund.createdAt
      },
      this.id,
      this.addedAt
    )

    const event = new CampParticipantRefundRegisteredDomainEvent(
      updatedCampParticipant.toSnapshot()
    )

    return [updatedCampParticipant, event]
  }

  public toSnapshot(): CampParticipantSnapshot {
    return {
      id: this.id,
      campId: this.campId,
      person: this.person,
      status: this.status,
      totalAmountDue: this.totalAmountDue,
      discounts: this.discounts,
      financialTransactions: this.financialTransactions,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt
    }
  }

  public get person() {
    return copyPerson(this._person)
  }

  public get status() {
    return this._status
  }

  public get totalAmountDue() {
    return Money.create(this._totalAmountDue.toSnapshot())
  }

  public get discounts() {
    return this._discounts.map(copyDiscount)
  }

  public get financialTransactions() {
    return this._financialTransactions.map(copyFinancialTransaction)
  }

  public get addedAt() {
    return copyDate(this._addedAt)
  }

  public get updatedAt() {
    return copyDate(this._updatedAt)
  }
}

export class CampParticipantRegisteredDomainEvent extends DomainEvent<CampParticipantSnapshot> {
  public readonly eventName = 'camp.participant.registered'

  public constructor(campParticipant: CampParticipantSnapshot) {
    super(campParticipant)
  }
}

export class CampParticipantDiscountAppliedDomainEvent extends DomainEvent<CampParticipantSnapshot> {
  public readonly eventName = 'camp.participant.discount_applied'

  public constructor(campParticipant: CampParticipantSnapshot) {
    super(campParticipant)
  }
}

export class CampParticipantPaymentRegisteredDomainEvent extends DomainEvent<CampParticipantSnapshot> {
  public readonly eventName = 'camp.participant.payment_registered'

  public constructor(campParticipant: CampParticipantSnapshot) {
    super(campParticipant)
  }
}

export class CampParticipantRefundRegisteredDomainEvent extends DomainEvent<CampParticipantSnapshot> {
  public readonly eventName = 'camp.participant.refund_registered'

  public constructor(campParticipant: CampParticipantSnapshot) {
    super(campParticipant)
  }
}

export class InvalidCampParticipantCampIdError extends Error {
  public constructor(campId: string) {
    super(`Camp participant camp id is invalid: ${campId}`)
    this.name = 'InvalidCampParticipantCampIdError'
  }
}

export class InvalidCampParticipantMemberIdError extends Error {
  public constructor(memberId: string) {
    super(`Camp participant member id is invalid: ${memberId}`)
    this.name = 'InvalidCampParticipantMemberIdError'
  }
}

export class InvalidExternalCampParticipantNameError extends Error {
  public constructor(firstName: string, lastName: string) {
    super(`External camp participant name is invalid: ${firstName} ${lastName}`)
    this.name = 'InvalidExternalCampParticipantNameError'
  }
}

export class CampParticipantCurrencyMismatchError extends Error {
  public constructor(expectedCurrency: string, providedCurrency: string) {
    super(
      `Camp participant currency mismatch. Expected ${expectedCurrency}, got ${providedCurrency}`
    )
    this.name = 'CampParticipantCurrencyMismatchError'
  }
}

export class CampParticipantDiscountExceedsAmountDueError extends Error {
  public constructor() {
    super('Camp participant discount exceeds amount due')
    this.name = 'CampParticipantDiscountExceedsAmountDueError'
  }
}
