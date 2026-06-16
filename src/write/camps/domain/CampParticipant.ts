import { copyDate } from '@/write/shared/DateUtils'
import { CampParticipantLedger } from '@/write/camps/domain/CampParticipantLedger'
import { DomainEvent } from '@/write/shared/events/DomainEvent'
import {
  isStandardizableName,
  standardizeName
} from '@/write/shared/NameStandardization'
import type {
  Discount,
  DiscountInput,
  FinancialTransaction,
  NonRefundableDeposit,
  NonRefundableDepositInput,
  PaymentInput,
  RefundInput
} from '@/write/shared/vo/FinancialTransaction'
import {
  copyDiscount,
  copyFinancialTransaction,
  createDiscount,
  createNonRefundableDeposit,
  createNonRefundableDepositReversal,
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

const resolvePaymentStatus = (
  totalAmountDue: Money,
  financialBalanceAmountMinor: number
): CampParticipantStatus =>
  financialBalanceAmountMinor >= totalAmountDue.amountMinor
    ? 'FULLY_PAID'
    : 'REGISTERED'

const resolveRefundStatus = (
  financialBalanceAmountMinor: number
): CampParticipantStatus =>
  financialBalanceAmountMinor === 0 ? 'REFUNDED' : 'RESIGNED'

const resolveStatusAfterRefund = (
  currentStatus: CampParticipantStatus,
  totalAmountDue: Money,
  financialBalanceAmountMinor: number
): CampParticipantStatus =>
  currentStatus === 'RESIGNED'
    ? resolveRefundStatus(financialBalanceAmountMinor)
    : resolvePaymentStatus(totalAmountDue, financialBalanceAmountMinor)

const assertCanApplyDiscount = (status: CampParticipantStatus): void => {
  if (status === 'RESIGNED' || status === 'REFUNDED') {
    throw new CampParticipantDiscountNotAllowedError(status)
  }
}

const assertCanRegisterPayment = (status: CampParticipantStatus): void => {
  if (status === 'RESIGNED' || status === 'REFUNDED') {
    throw new CampParticipantPaymentNotAllowedError(status)
  }
}

const assertCanRegisterRefund = (status: CampParticipantStatus): void => {
  if (status === 'REFUNDED') {
    throw new CampParticipantRefundNotAllowedError(status)
  }
}

const assertCanResign = (status: CampParticipantStatus): void => {
  if (status === 'RESIGNED' || status === 'REFUNDED') {
    throw new CampParticipantResignationNotAllowedError(status)
  }
}

const assertCanCancelResignation = (status: CampParticipantStatus): void => {
  if (status !== 'RESIGNED' && status !== 'REFUNDED') {
    throw new CampParticipantResignationCancellationNotAllowedError(status)
  }
}

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

  /**
   * Creates a new camp participant.
   * It checks the camp id and person data, starts with no discounts or
   * payments, and returns the created participant with its domain event.
   */
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

  /**
   * Rebuilds a participant from saved data.
   * It copies nested values so the new object owns its state.
   */
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

  /**
   * Adds a discount to an active participant.
   * It checks that the participant can still receive discounts, uses the same
   * currency as the camp price and does not reduce the amount due below zero.
   * The returned participant has a recalculated payment status.
   */
  public applyDiscount(
    input: DiscountInput
  ): [CampParticipant, CampParticipantDiscountAppliedDomainEvent] {
    assertCanApplyDiscount(this._status)

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
          CampParticipantLedger.from(this._financialTransactions).balanceMinor()
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

  /**
   * Registers a payment for an active participant.
   * It checks the payment currency, adds the payment to the ledger and updates
   * the status to fully paid when the balance covers the amount due.
   */
  public registerPayment(
    input: PaymentInput
  ): [CampParticipant, CampParticipantPaymentRegisteredDomainEvent] {
    assertCanRegisterPayment(this._status)

    const payment = createPayment(input)

    assertMatchingCurrency(this._totalAmountDue, payment.amount)

    const financialTransactions = [...this._financialTransactions, payment]
    const ledger = CampParticipantLedger.from(financialTransactions)

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: resolvePaymentStatus(
          this._totalAmountDue,
          ledger.balanceMinor()
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

  /**
   * Registers a refund for a participant with refundable balance.
   * It checks that the refund uses the camp currency and does not exceed the
   * current refundable balance. Active participants return to the payment
   * status matching their remaining balance; resigned participants become
   * refunded only when the balance is zero.
   */
  public registerRefund(
    input: RefundInput
  ): [CampParticipant, CampParticipantRefundRegisteredDomainEvent] {
    assertCanRegisterRefund(this._status)

    const refund = createRefund(input)

    assertMatchingCurrency(this._totalAmountDue, refund.amount)

    const currentLedger = CampParticipantLedger.from(
      this._financialTransactions
    )

    if (refund.amount.amountMinor > currentLedger.balanceMinor()) {
      throw new CampParticipantRefundExceedsRefundableBalanceError()
    }

    const financialTransactions = [...this._financialTransactions, refund]
    const ledger = CampParticipantLedger.from(financialTransactions)

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: resolveStatusAfterRefund(
          this._status,
          this._totalAmountDue,
          ledger.balanceMinor()
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

  /**
   * Marks the participant as resigned.
   * An optional non-refundable deposit can be kept from the paid balance. The
   * deposit must use the camp currency and cannot be higher than what was paid.
   */
  public resign(
    input?: NonRefundableDepositInput
  ): [CampParticipant, CampParticipantResignedDomainEvent] {
    assertCanResign(this._status)

    const nonRefundableDeposit = input
      ? createNonRefundableDeposit(input)
      : undefined

    if (nonRefundableDeposit) {
      assertMatchingCurrency(this._totalAmountDue, nonRefundableDeposit.amount)

      if (
        nonRefundableDeposit.amount.amountMinor >
        CampParticipantLedger.from(this._financialTransactions).balanceMinor()
      ) {
        throw new CampParticipantNonRefundableDepositExceedsPaidBalanceError()
      }
    }

    const financialTransactions = nonRefundableDeposit
      ? [...this._financialTransactions, nonRefundableDeposit]
      : this._financialTransactions

    const updatedAt = nonRefundableDeposit?.createdAt ?? new Date()

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: 'RESIGNED',
        totalAmountDue: this._totalAmountDue,
        discounts: this._discounts,
        financialTransactions,
        updatedAt
      },
      this.id,
      this.addedAt
    )

    const event = new CampParticipantResignedDomainEvent(
      updatedCampParticipant.toSnapshot()
    )

    return [updatedCampParticipant, event]
  }

  /**
   * Cancels a resignation.
   * It reverses every active non-refundable deposit, adds those reversals to
   * the ledger and then recalculates whether the participant is registered or
   * fully paid.
   */
  public cancelResignation(
    generateReversalId: (deposit: NonRefundableDeposit) => string
  ): [CampParticipant, CampParticipantResignationCanceledDomainEvent] {
    assertCanCancelResignation(this._status)

    const currentLedger = CampParticipantLedger.from(
      this._financialTransactions
    )
    const depositReversals = currentLedger
      .unreversedNonRefundableDeposits()
      .map((deposit) =>
        createNonRefundableDepositReversal({
          id: generateReversalId(deposit),
          reversedTransactionId: deposit.id,
          amount: deposit.amount,
          note: ''
        })
      )

    const financialTransactions = [
      ...this._financialTransactions,
      ...depositReversals
    ]
    const ledger = CampParticipantLedger.from(financialTransactions)

    const lastReversal = depositReversals[depositReversals.length - 1]
    const updatedAt = lastReversal?.createdAt ?? new Date()

    const updatedCampParticipant = new CampParticipant(
      {
        campId: this.campId,
        person: this.person,
        status: resolvePaymentStatus(
          this._totalAmountDue,
          ledger.balanceMinor()
        ),
        totalAmountDue: this._totalAmountDue,
        discounts: this._discounts,
        financialTransactions,
        updatedAt
      },
      this.id,
      this.addedAt
    )

    const event = new CampParticipantResignationCanceledDomainEvent(
      updatedCampParticipant.toSnapshot()
    )

    return [updatedCampParticipant, event]
  }

  /**
   * Shows how much the participant still needs to pay.
   * It delegates the calculation to the participant ledger.
   */
  public remainingAmountToPay(): Money {
    return CampParticipantLedger.from(
      this._financialTransactions
    ).remainingAmountToPay(this._totalAmountDue)
  }

  /**
   * Shows the participant's current positive balance.
   * Negative ledger values are returned as zero because this method is meant to
   * show money available on the participant account.
   */
  public financialBalance(): Money {
    return createMoneyInSameCurrency(
      this._totalAmountDue,
      Math.max(
        CampParticipantLedger.from(this._financialTransactions).balanceMinor(),
        0
      )
    )
  }

  /**
   * Creates a saved copy of the participant.
   * Getters are used so nested values are copied before leaving the aggregate.
   */
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

export class CampParticipantResignedDomainEvent extends DomainEvent<CampParticipantSnapshot> {
  public readonly eventName = 'camp.participant.resigned'

  public constructor(campParticipant: CampParticipantSnapshot) {
    super(campParticipant)
  }
}

export class CampParticipantResignationCanceledDomainEvent extends DomainEvent<CampParticipantSnapshot> {
  public readonly eventName = 'camp.participant.resignation_canceled'

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

export class CampParticipantDiscountNotAllowedError extends Error {
  public constructor(status: CampParticipantStatus) {
    super(`Camp participant discount is not allowed for status: ${status}`)
    this.name = 'CampParticipantDiscountNotAllowedError'
  }
}

export class CampParticipantPaymentNotAllowedError extends Error {
  public constructor(status: CampParticipantStatus) {
    super(`Camp participant payment is not allowed for status: ${status}`)
    this.name = 'CampParticipantPaymentNotAllowedError'
  }
}

export class CampParticipantRefundNotAllowedError extends Error {
  public constructor(status: CampParticipantStatus) {
    super(`Camp participant refund is not allowed for status: ${status}`)
    this.name = 'CampParticipantRefundNotAllowedError'
  }
}

export class CampParticipantResignationNotAllowedError extends Error {
  public constructor(status: CampParticipantStatus) {
    super(`Camp participant resignation is not allowed for status: ${status}`)
    this.name = 'CampParticipantResignationNotAllowedError'
  }
}

export class CampParticipantResignationCancellationNotAllowedError extends Error {
  public constructor(status: CampParticipantStatus) {
    super(
      `Camp participant resignation cancellation is not allowed for status: ${status}`
    )
    this.name = 'CampParticipantResignationCancellationNotAllowedError'
  }
}

export class CampParticipantRefundExceedsRefundableBalanceError extends Error {
  public constructor() {
    super('Camp participant refund exceeds refundable balance')
    this.name = 'CampParticipantRefundExceedsRefundableBalanceError'
  }
}

export class CampParticipantNonRefundableDepositExceedsPaidBalanceError extends Error {
  public constructor() {
    super('Camp participant non-refundable deposit exceeds paid balance')
    this.name = 'CampParticipantNonRefundableDepositExceedsPaidBalanceError'
  }
}
