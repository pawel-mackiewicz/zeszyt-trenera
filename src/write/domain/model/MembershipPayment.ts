import { DomainEvent } from '@/write/domain/events/DomainEvent'
import { copyDate } from './DateUtils'

// Offline filters and future Dexie indexes need one timezone-free month key, so the domain only accepts already-canonical YYYY-MM values instead of date-like inputs.
const assertCoveredMonth = (value: string): string => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new InvalidMembershipPaymentCoveredMonthError(value)
  }

  return value
}

export type RecordMembershipPaymentInput = {
  memberId: string
  coveredMonth: string
}

export type MembershipPaymentSnapshot = {
  id: string
  memberId: string
  coveredMonth: string
  createdAt: Date
}

/**
 * Serializes a calendar month into the canonical membership-payment key.
 *
 * Why: the read query and the UI confirmation flow both need the exact same month identity that the write side validates and persists.
 */
export function toMembershipPaymentCoveredMonth(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0')

  return `${value.getFullYear()}-${month}`
}

export class MembershipPayment {
  public readonly id: string

  private _memberId: string
  private _coveredMonth: string
  private _createdAt: Date

  private constructor(
    input: RecordMembershipPaymentInput,
    id: string,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this._memberId = input.memberId
    this._coveredMonth = assertCoveredMonth(input.coveredMonth)
    this._createdAt = copyDate(createdAt)
  }

  public static record(
    input: RecordMembershipPaymentInput,
    id: string
  ): [MembershipPayment, MembershipPaymentRecordedDomainEvent] {
    // Recording receives the ID from outside so the aggregate stays independent from infrastructure ID generators.
    const payment = new MembershipPayment(input, id)
    // Event payloads store snapshots so the offline ledger replays the exact recorded month without depending on a live aggregate instance.
    const event = new MembershipPaymentRecordedDomainEvent(payment.toSnapshot())
    return [payment, event]
  }

  public static restore(
    snapshot: MembershipPaymentSnapshot
  ): MembershipPayment {
    return new MembershipPayment(
      {
        memberId: snapshot.memberId,
        coveredMonth: snapshot.coveredMonth
      },
      snapshot.id,
      snapshot.createdAt
    )
  }

  public static delete(
    existingPayment: MembershipPayment
  ): MembershipPaymentDeletedDomainEvent {
    // Why: payment deletion removes the row, so the local-first event log needs the exact snapshot that disappeared.
    return new MembershipPaymentDeletedDomainEvent(existingPayment.toSnapshot())
  }

  // Persistence adapters and event serializers share one snapshot so stored membership payment data cannot drift apart.
  public toSnapshot(): MembershipPaymentSnapshot {
    return {
      id: this.id,
      memberId: this.memberId,
      coveredMonth: this.coveredMonth,
      createdAt: this.createdAt
    }
  }

  public get memberId() {
    return this._memberId
  }

  public get coveredMonth() {
    return this._coveredMonth
  }

  public get createdAt() {
    return copyDate(this._createdAt)
  }
}

export class MembershipPaymentRecordedDomainEvent extends DomainEvent<MembershipPaymentSnapshot> {
  public readonly eventName = 'membership-payment.recorded'

  public constructor(payment: MembershipPaymentSnapshot) {
    // The payload is the canonical replay contract so persistence adapters can store new event types without per-event translation logic.
    super(payment)
  }
}

export class MembershipPaymentDeletedDomainEvent extends DomainEvent<MembershipPaymentSnapshot> {
  public readonly eventName = 'membership-payment.deleted'

  public constructor(payment: MembershipPaymentSnapshot) {
    // Delete events carry the removed snapshot so backup/replay paths can identify which month was corrected.
    super(payment)
  }
}

export class MembershipPaymentAlreadyExistsError extends Error {
  public constructor() {
    super('Membership payment for this member and covered month already exists')
    this.name = 'MembershipPaymentAlreadyExistsError'
  }
}

export class MembershipPaymentNotFoundError extends Error {
  public constructor(membershipPaymentId: string) {
    super(`Membership payment not found: ${membershipPaymentId}`)
    this.name = 'MembershipPaymentNotFoundError'
  }
}

export class InvalidMembershipPaymentCoveredMonthError extends Error {
  public constructor(coveredMonth: string) {
    super(`Membership payment covered month must use YYYY-MM: ${coveredMonth}`)
    this.name = 'InvalidMembershipPaymentCoveredMonthError'
  }
}

// Real-world payment timestamps stay out of v1 payment state until the product needs to distinguish when money changed hands from when the notebook recorded the month as paid.
