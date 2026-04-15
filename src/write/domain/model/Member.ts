import { DomainEvent } from '@/write/domain/events/DomainEvent'
import { PhoneNumber } from '@/write/domain/model/vo/PhoneNumber'
import { copyDate, copyOptionalDate } from './DateUtils'

const assertValidBirthDate = (dateOfBirth: Date, now: Date): void => {
  if (!(dateOfBirth instanceof Date) || Number.isNaN(dateOfBirth.getTime())) {
    // Why: domain validation still runs as a runtime boundary, so it must reject malformed birth-date payloads even when callers bypass TypeScript contracts.
    throw new InvalidMemberBirthDateError()
  }

  if (dateOfBirth >= now) {
    throw new InvalidMemberBirthDateError()
  }
  const earliestAllowedBirthDate = new Date(
    Date.UTC(now.getUTCFullYear() - 120, 0, 1)
  )
  // Why: age-first entry normalizes to January 1 of the chosen birth year, so the aggregate must treat the full 120-year boundary year as valid instead of rejecting that canonicalized date partway through the year.
  if (dateOfBirth < earliestAllowedBirthDate) {
    throw new InvalidMemberBirthDateError()
  }
}

const assertValidJoinDate = (
  joinedAt: Date | undefined,
  dateOfBirth: Date,
  now: Date
): void => {
  if (!joinedAt) return

  if (joinedAt > now) {
    throw new InvalidMemberJoinDateError()
  }
  if (dateOfBirth >= joinedAt) {
    throw new InvalidMemberJoinDateError()
  }
}

const assertValidName = (name: string): void => {
  if (!name || name.trim().length === 0 || !/^[\p{L}\s-]+$/u.test(name)) {
    throw new InvalidMemberNameError(name)
  }
}

const normalizeMemberName = (name: string): string => {
  return name.trim().toLowerCase()
}

type ValidateMemberProfileInput = {
  firstName: string
  lastName: string
  dateOfBirth: Date
  joinedAt?: Date
}

function validateMemberProfile(input: ValidateMemberProfileInput): void {
  const now = new Date()
  assertValidBirthDate(input.dateOfBirth, now)
  assertValidJoinDate(input.joinedAt, input.dateOfBirth, now)
  assertValidName(input.firstName)
  assertValidName(input.lastName)
}

export type RegisterMemberInput = {
  firstName: string
  lastName: string
  phoneNumber?: PhoneNumber
  dateOfBirth: Date
  joinedAt?: Date
}

export type UpdateMemberInput = {
  memberId: string
  firstName: string
  lastName: string
  phoneNumber?: PhoneNumber
  dateOfBirth: Date
  joinedAt?: Date
}

type MemberStateInput = {
  firstName: string
  lastName: string
  phoneNumber?: PhoneNumber
  dateOfBirth: Date
  joinedAt?: Date
}

export type MemberSnapshot = {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
  createdAt: Date
}

export type MemberUpdatedSnapshot = {
  memberId: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
}

export class Member {
  public readonly id: string

  private _firstName: string
  private _lastName: string
  private _phoneNumber?: PhoneNumber
  private _dateOfBirth: Date
  private _joinedAt?: Date
  private _createdAt: Date

  private constructor(input: MemberStateInput, id: string, createdAt?: Date) {
    this.id = id
    this._firstName = input.firstName
    this._lastName = input.lastName
    this._phoneNumber = input.phoneNumber
    this._dateOfBirth = copyDate(input.dateOfBirth)
    this._joinedAt = copyOptionalDate(input.joinedAt)
    this._createdAt = copyDate(createdAt ?? new Date())
  }
  public static register(
    input: RegisterMemberInput,
    id: string
  ): [Member, MemberCreatedDomainEvent] {
    validateMemberProfile(input)
    const firstName = normalizeMemberName(input.firstName)
    const lastName = normalizeMemberName(input.lastName)
    //
    // Registration receives the ID from outside so the aggregate stays independent from infrastructure ID generators.
    const member = new Member({ ...input, firstName, lastName }, id)
    // Event payloads store snapshots so local-first replay keeps the original canonical phone and dates even if an aggregate instance is later replaced in memory.
    const event = new MemberCreatedDomainEvent(member.toSnapshot())
    return [member, event]
  }

  public static rehydrate(snapshot: MemberSnapshot): Member {
    // Why: update workflows need a real aggregate instance loaded from persistence so validation and event creation stay in the domain model instead of use-case glue.
    return new Member(
      {
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        // Why: persisted member snapshots may now omit phone numbers, so rehydration must preserve that absence instead of inventing placeholder identity data.
        phoneNumber:
          snapshot.phoneNumber === undefined
            ? undefined
            : PhoneNumber.create(snapshot.phoneNumber),
        dateOfBirth: snapshot.dateOfBirth,
        joinedAt: snapshot.joinedAt
      },
      snapshot.id,
      snapshot.createdAt
    )
  }

  public static update(
    existingMember: Member,
    input: UpdateMemberInput
  ): [Member, MemberUpdatedDomainEvent] {
    if (input.memberId !== existingMember.id) {
      throw new MemberIdMismatchError(existingMember.id, input.memberId)
    }

    validateMemberProfile(input)

    const updatedMember = new Member(
      {
        firstName: normalizeMemberName(input.firstName),
        lastName: normalizeMemberName(input.lastName),
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth,
        joinedAt: input.joinedAt
      },
      existingMember.id,
      existingMember.createdAt
    )

    const updateEvent = new MemberUpdatedDomainEvent({
      memberId: updatedMember.id,
      firstName: updatedMember.firstName,
      lastName: updatedMember.lastName,
      // Why: update events must mirror the aggregate snapshot contract so local-first replay can tell the difference between keeping and clearing optional contact data.
      ...(updatedMember.phoneNumber === undefined
        ? {}
        : { phoneNumber: updatedMember.phoneNumber.value }),
      dateOfBirth: updatedMember.dateOfBirth,
      ...(updatedMember.joinedAt === undefined
        ? {}
        : { joinedAt: updatedMember.joinedAt })
    })

    return [updatedMember, updateEvent]
  }

  // Persistence adapters and event serializers share one snapshot so stored member data cannot drift apart.
  public toSnapshot(): MemberSnapshot {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      // Snapshots stay string-based so event payloads and persisted rows keep the same contract outside the domain model.
      ...(this.phoneNumber === undefined
        ? {}
        : { phoneNumber: this.phoneNumber.value }),
      dateOfBirth: this.dateOfBirth,
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
    // Why: member state now models phone as optional data, so callers must observe a real absence instead of inferring one from a sentinel string.
    return this._phoneNumber
  }

  public get dateOfBirth() {
    return copyDate(this._dateOfBirth)
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

export class MemberUpdatedDomainEvent extends DomainEvent<MemberUpdatedSnapshot> {
  public readonly eventName = 'member.updated'

  public constructor(payload: MemberUpdatedSnapshot) {
    super(payload)
  }
}

export class MemberAlreadyExistsError extends Error {
  public constructor() {
    super('Member with the same name and birth date already exists')
    this.name = 'MemberAlreadyExistsError'
  }
}

export class MemberNotFoundError extends Error {
  public constructor(memberId: string) {
    super(`Member not found: ${memberId}`)
    this.name = 'MemberNotFoundError'
  }
}

export class MemberIdMismatchError extends Error {
  public constructor(expectedMemberId: string, providedMemberId: string) {
    super(
      `Member update id mismatch. Expected ${expectedMemberId}, got ${providedMemberId}`
    )
    this.name = 'MemberIdMismatchError'
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
