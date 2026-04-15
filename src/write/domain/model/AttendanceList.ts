import { DomainEvent } from '@/write/domain/events/DomainEvent'
import { copyDate } from './DateUtils'

const MAX_START_FUTURE_OFFSET_IN_MS = 24 * 60 * 60 * 1000

const assertValidMemberId = (memberId: string): string => {
  if (memberId.trim().length === 0) {
    throw new InvalidAttendanceListMemberIdError(memberId)
  }

  return memberId
}

const assertUniqueMemberIds = (memberIds: string[]): string[] => {
  const seen = new Set<string>()

  return memberIds.map((memberId) => {
    const validatedMemberId = assertValidMemberId(memberId)

    if (seen.has(validatedMemberId)) {
      throw new DuplicateAttendanceListMemberError(validatedMemberId)
    }

    seen.add(validatedMemberId)

    return validatedMemberId
  })
}

const assertValidStart = (start: Date, now: Date): Date => {
  if (Number.isNaN(start.getTime())) {
    throw new InvalidAttendanceListStartError(start)
  }

  // The notebook can prepare tomorrow's training ahead of time, but a larger future offset is more likely a mobile date-picker mistake than intentional planning.
  if (start.getTime() - now.getTime() > MAX_START_FUTURE_OFFSET_IN_MS) {
    throw new InvalidAttendanceListStartError(start)
  }

  return copyDate(start)
}

export type RegisterAttendanceListInput = {
  memberIds: string[]
  start: Date
}

export type UpdateAttendanceListInput = {
  attendanceListId: string
  memberIds: string[]
  start: Date
}

export type AttendanceListSnapshot = {
  id: string
  memberIds: string[]
  start: Date
  createdAt: Date
}

export class AttendanceList {
  public readonly id: string

  private _memberIds: string[]
  private _start: Date
  private _createdAt: Date

  private constructor(
    input: RegisterAttendanceListInput,
    id: string,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this._memberIds = [...input.memberIds]
    this._start = copyDate(input.start)
    this._createdAt = copyDate(createdAt)
  }

  public static record(
    input: RegisterAttendanceListInput,
    id: string
  ): [AttendanceList, AttendanceListRecordedDomainEvent] {
    const now = new Date()
    const memberIds = assertUniqueMemberIds(input.memberIds)
    const start = assertValidStart(input.start, now)

    // The aggregate accepts an empty list because there may be the case when no one is on the mat
    const attendanceList = new AttendanceList(
      {
        memberIds,
        start
      },
      id
    )
    // Event payloads use the same snapshot contract as persistence so the offline event log can replay attendance without aggregate-specific mapping.
    const event = new AttendanceListRecordedDomainEvent(
      attendanceList.toSnapshot()
    )

    return [attendanceList, event]
  }

  public static rehydrate(snapshot: AttendanceListSnapshot): AttendanceList {
    // Why: update workflows need a real aggregate loaded from persistence so validation and event creation stay in the domain model instead of use-case glue.
    return new AttendanceList(
      {
        memberIds: snapshot.memberIds,
        start: snapshot.start
      },
      snapshot.id,
      snapshot.createdAt
    )
  }

  public static update(
    existingAttendanceList: AttendanceList,
    input: UpdateAttendanceListInput
  ): [AttendanceList, AttendanceListUpdatedDomainEvent] {
    if (input.attendanceListId !== existingAttendanceList.id) {
      throw new AttendanceListIdMismatchError(
        existingAttendanceList.id,
        input.attendanceListId
      )
    }

    const now = new Date()
    const memberIds = assertUniqueMemberIds(input.memberIds)
    const start = assertValidStart(input.start, now)
    const updatedAttendanceList = new AttendanceList(
      {
        memberIds,
        start
      },
      existingAttendanceList.id,
      existingAttendanceList.createdAt
    )
    // Why: update events must carry the same immutable snapshot contract as persistence so offline replay can rebuild edited sessions without event-specific mapping.
    const event = new AttendanceListUpdatedDomainEvent(
      updatedAttendanceList.toSnapshot()
    )

    return [updatedAttendanceList, event]
  }

  // Persistence adapters and event serializers share one snapshot so stored attendance data cannot drift apart.
  public toSnapshot(): AttendanceListSnapshot {
    return {
      id: this.id,
      memberIds: this.memberIds,
      start: this.start,
      createdAt: this.createdAt
    }
  }

  public get memberIds() {
    return [...this._memberIds]
  }

  public get start() {
    return copyDate(this._start)
  }

  public get createdAt() {
    return copyDate(this._createdAt)
  }
}

export class AttendanceListRecordedDomainEvent extends DomainEvent<AttendanceListSnapshot> {
  public readonly eventName = 'attendance-list.recorded'

  public constructor(attendanceList: AttendanceListSnapshot) {
    // The payload is the canonical replay contract so future adapters can persist this event type without event-specific translation.
    super(attendanceList)
  }
}

export class AttendanceListUpdatedDomainEvent extends DomainEvent<AttendanceListSnapshot> {
  public readonly eventName = 'attendance-list.updated'

  public constructor(attendanceList: AttendanceListSnapshot) {
    super(attendanceList)
  }
}

export class AttendanceListAlreadyExistsError extends Error {
  public constructor(start: Date) {
    super(`Attendance list already exists for start: ${start.toISOString()}`)
    this.name = 'AttendanceListAlreadyExistsError'
  }
}

export class AttendanceListNotFoundError extends Error {
  public constructor(attendanceListId: string) {
    super(`Attendance list not found: ${attendanceListId}`)
    this.name = 'AttendanceListNotFoundError'
  }
}

export class AttendanceListIdMismatchError extends Error {
  public constructor(
    expectedAttendanceListId: string,
    providedAttendanceListId: string
  ) {
    super(
      `Attendance list update id mismatch. Expected ${expectedAttendanceListId}, got ${providedAttendanceListId}`
    )
    this.name = 'AttendanceListIdMismatchError'
  }
}

export class DuplicateAttendanceListMemberError extends Error {
  public constructor(memberId: string) {
    super(
      `Attendance list contains the same member more than once: ${memberId}`
    )
    this.name = 'DuplicateAttendanceListMemberError'
  }
}

export class InvalidAttendanceListMemberIdError extends Error {
  public constructor(memberId: string) {
    super(`Attendance list member id is invalid: ${memberId}`)
    this.name = 'InvalidAttendanceListMemberIdError'
  }
}

export class InvalidAttendanceListStartError extends Error {
  public constructor(start: Date) {
    super(
      `Attendance list start must be a real date and not more than 1 day in the future: ${start.toString()}`
    )
    this.name = 'InvalidAttendanceListStartError'
  }
}
