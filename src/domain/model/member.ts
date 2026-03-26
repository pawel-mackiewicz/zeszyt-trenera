import { DomainEvent } from '@/domain/events/DomainEvent'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'
import { copyDate, copyOptionalDate } from './DateUtils'

const assertValidBirthDate = (
  dateOfBirth: Date | undefined,
  now: Date
): void => {
  if (!dateOfBirth) return

  if (dateOfBirth >= now) {
    throw new InvalidMemberBirthDateError()
  }
  const tooOld = new Date(now)
  tooOld.setUTCFullYear(tooOld.getUTCFullYear() - 120)
  if (dateOfBirth <= tooOld) {
    throw new InvalidMemberBirthDateError()
  }
}

const assertValidJoinDate = (
  joinedAt: Date | undefined,
  dateOfBirth: Date | undefined,
  now: Date
): void => {
  if (!joinedAt) return

  if (joinedAt > now) {
    throw new InvalidMemberJoinDateError()
  }
  if (dateOfBirth && dateOfBirth >= joinedAt) {
    throw new InvalidMemberJoinDateError()
  }
}

const assertValidName = (name: string): void => {
  if (!name || name.trim().length === 0 || !/^[\p{L}\s-]+$/u.test(name)) {
    throw new InvalidMemberNameError(name)
  }
}

export const normalizeMemberName = (name: string): string => {
  return name.trim().toLowerCase()
}

export type RegisterMemberInput = {
  firstName: string
  lastName: string
  phoneNumber: PhoneNumber
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
  private _phoneNumber: PhoneNumber
  private _dateOfBirth?: Date
  private _joinedAt?: Date
  private _createdAt: Date

  private constructor(input: RegisterMemberInput, id: string) {
    this.id = id
    this._firstName = input.firstName
    this._lastName = input.lastName
    this._phoneNumber = input.phoneNumber
    this._dateOfBirth = copyOptionalDate(input.dateOfBirth)
    this._joinedAt = copyOptionalDate(input.joinedAt)
    this._createdAt = new Date()
  }
  public static register(
    input: RegisterMemberInput,
    id: string
  ): [Member, MemberCreatedDomainEvent] {
    const now = new Date()

    assertValidBirthDate(input.dateOfBirth, now)
    assertValidJoinDate(input.joinedAt, input.dateOfBirth, now)
    assertValidName(input.firstName)
    assertValidName(input.lastName)
    const firstName = normalizeMemberName(input.firstName)
    const lastName = normalizeMemberName(input.lastName)
    //
    // Registration receives the ID from outside so the aggregate stays independent from infrastructure ID generators.
    const member = new Member({ ...input, firstName, lastName }, id)
    // Event payloads store snapshots so local-first replay keeps the original canonical phone and dates even if an aggregate instance is later replaced in memory.
    const event = new MemberCreatedDomainEvent(member.toSnapshot())
    return [member, event]
  }

  // Persistence adapters and event serializers share one snapshot so stored member data cannot drift apart.
  public toSnapshot(): MemberSnapshot {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      // Snapshots stay string-based so event payloads and persisted rows keep the same contract outside the domain model.
      phoneNumber: this.phoneNumber.value,
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

export class InvalidMemberBirthDateError extends Error {
  public constructor() {
    super('Member birth date must be in the past and not older than 120 years')
    this.name = 'InvalidMemberBirthDateError'
  }
}

export class InvalidMemberJoinDateError extends Error {
  public constructor() {
    super('Member joined date must be in the past and after birth date')
    this.name = 'InvalidMemberJoinDateError'
  }
}

export class InvalidMemberNameError extends Error {
  public constructor(name: string) {
    super(`Member name is invalid: ${name}`)
    this.name = 'InvalidMemberNameError'
  }
}

// BJJ progression stays out of v1 member state until the product defines how belts and badges evolve over time and how that history should be audited.
