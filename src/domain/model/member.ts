import { DomainEvent } from '@/domain/events/DomainEvent'

// Domain dates stay behind defensive copies because Date mutators would otherwise let callers rewrite aggregate history.
const copyDate = (value: Date): Date => new Date(value.getTime())

const copyOptionalDate = (value?: Date): Date | undefined =>
  value === undefined ? undefined : copyDate(value)

// Local-first records and offline-created events must agree on one persisted phone format, so the domain only accepts already-canonical E.164 values instead of rewriting user input implicitly.
const assertE164PhoneNumber = (value: string): string => {
  if (!/^\+[1-9]\d{1,14}$/.test(value)) {
    throw new InvalidMemberPhoneNumberError(value)
  }

  return value
}

export type RegisterMemberInput = {
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth?: Date
  joinedAt?: Date
}

export type MemberSnapshot = {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth?: Date
  joinedAt?: Date
  createdAt: Date
}

export class Member {
  public readonly id: string

  private _firstName: string
  private _lastName: string
  private _phoneNumber: string
  private _dateOfBirth?: Date
  private _joinedAt?: Date
  private _createdAt: Date

  private constructor(
    input: RegisterMemberInput,
    id: string,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this._firstName = input.firstName
    this._lastName = input.lastName
    this._phoneNumber = assertE164PhoneNumber(input.phoneNumber)
    this._dateOfBirth = copyOptionalDate(input.dateOfBirth)
    this._joinedAt = copyOptionalDate(input.joinedAt)
    this._createdAt = copyDate(createdAt)
  }

  public static register(
    input: RegisterMemberInput,
    id: string
  ): [Member, MemberCreatedDomainEvent] {
    // Registration receives the ID from outside so the aggregate stays independent from infrastructure ID generators.
    const member = new Member(input, id)
    // Event payloads store snapshots so local-first replay keeps the original canonical phone and dates even if an aggregate instance is later replaced in memory.
    const event = new MemberCreatedDomainEvent(member.toSnapshot())
    return [member, event]
  }

  public static restore(snapshot: MemberSnapshot): Member {
    return new Member(
      {
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        phoneNumber: snapshot.phoneNumber,
        dateOfBirth: snapshot.dateOfBirth,
        joinedAt: snapshot.joinedAt
      },
      snapshot.id,
      snapshot.createdAt
    )
  }

  // Persistence adapters and event serializers share one snapshot so stored member data cannot drift apart.
  public toSnapshot(): MemberSnapshot {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      ...(this.dateOfBirth === undefined
        ? {}
        : { dateOfBirth: this.dateOfBirth }),
      ...(this.joinedAt === undefined ? {} : { joinedAt: this.joinedAt }),
      createdAt: this.createdAt
    }
  }

  public get firstName() {
    return this._firstName
  }

  public get lastName() {
    return this._lastName
  }

  public get phoneNumber() {
    return this._phoneNumber
  }

  public get dateOfBirth() {
    return copyOptionalDate(this._dateOfBirth)
  }

  public get joinedAt() {
    return copyOptionalDate(this._joinedAt)
  }

  public get createdAt() {
    return copyDate(this._createdAt)
  }
}

export class MemberCreatedDomainEvent extends DomainEvent<MemberSnapshot> {
  public readonly eventName = 'member.created'

  public constructor(member: MemberSnapshot) {
    // The payload is the canonical replay contract so persistence adapters can store new event types without per-event translation logic.
    super(member)
  }
}

export class MemberAlreadyExistsError extends Error {
  public constructor() {
    super('Member with the same name and phone number already exists')
    this.name = 'MemberAlreadyExistsError'
  }
}

export class MemberNotFoundError extends Error {
  public constructor(memberId: string) {
    super(`Member not found: ${memberId}`)
    this.name = 'MemberNotFoundError'
  }
}

export class InvalidMemberPhoneNumberError extends Error {
  public constructor(phoneNumber: string) {
    super(`Member phone number must be a valid E.164 number: ${phoneNumber}`)
    this.name = 'InvalidMemberPhoneNumberError'
  }
}

// BJJ progression stays out of v1 member state until the product defines how belts and badges evolve over time and how that history should be audited.
