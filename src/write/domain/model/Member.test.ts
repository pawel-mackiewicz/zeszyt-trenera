import { afterEach, describe, expect, it, vi } from 'vitest'

import { PhoneNumber } from '@/write/domain/model/vo/PhoneNumber'
import {
  Member,
  MemberCreatedDomainEvent,
  InvalidMemberBirthDateError,
  InvalidMemberJoinDateError,
  InvalidMemberNameError,
  MemberIdMismatchError
} from '@/write/domain/model/Member'

function createPhoneNumber(rawPhoneNumber = '+48 123 456 789') {
  return PhoneNumber.create(rawPhoneNumber)
}

function createBirthDate(rawBirthDate = '2010-01-01T00:00:00Z') {
  return new Date(rawBirthDate)
}

describe('Member Model', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should create a member with all required properties', () => {
    const id = 'member-1'
    const beforeCreation = new Date()
    const phoneNumber = createPhoneNumber()

    // Passing the ID explicitly proves the aggregate follows the same boundary as the other models and does not generate identifiers on its own.
    const [member, event] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber,
        dateOfBirth: createBirthDate()
      },
      id
    )

    const afterCreation = new Date()

    expect(member.id).toBe(id)
    expect(member.firstName).toBe('jane')
    expect(member.lastName).toBe('doe')
    expect(member.phoneNumber).toBe(phoneNumber)
    expect(member.phoneNumber?.value).toBe('+48123456789')

    expect(member.createdAt).toBeDefined()
    expect(member.createdAt).toBeInstanceOf(Date)
    expect(member.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(member.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )

    expect(member.toSnapshot()).toEqual({
      id,
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: createBirthDate(),
      archived: false,
      createdAt: member.createdAt
    })

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
    expect(event).toBeInstanceOf(MemberCreatedDomainEvent)
    // The raw payload is now the canonical event contract so future persistence adapters can store the snapshot without wrapper-specific mapping.
    expect(event.payload).toEqual(member.toSnapshot())
  })

  it('toSnapshot omits optional join date when the member does not have it', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    const snapshot = member.toSnapshot()

    // Persisted snapshots should omit absent optional dates so local records do not accumulate meaningless undefined keys.
    expect(snapshot).toEqual({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: createBirthDate(),
      archived: false,
      createdAt: member.createdAt
    })
    expect('joinedAt' in snapshot).toBe(false)
  })

  it('toSnapshot includes optional date fields when the member has them', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
        joinedAt: new Date('2024-09-01T00:00:00Z')
      },
      'member-1'
    )

    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      archived: false,
      createdAt: member.createdAt
    })
  })

  it('keeps date fields immutable when callers mutate shared references', () => {
    const dateOfBirth = createBirthDate()
    const joinedAt = new Date('2024-09-01T00:00:00Z')
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth,
        joinedAt
      },
      'member-1'
    )

    // Mutating caller-owned dates after registration must not rewrite aggregate state through shared objects.
    dateOfBirth.setUTCFullYear(2015)
    joinedAt.setUTCFullYear(2025)

    expect(member.dateOfBirth).toEqual(new Date('2010-01-01T00:00:00Z'))
    expect(member.joinedAt).toEqual(new Date('2024-09-01T00:00:00Z'))

    // Getter and snapshot consumers also receive copies so the aggregate keeps exclusive ownership of its timeline.
    const exposedDateOfBirth = member.dateOfBirth
    const exposedJoinedAt = member.joinedAt
    const exposedCreatedAt = member.createdAt
    const snapshot = member.toSnapshot()

    exposedDateOfBirth?.setUTCFullYear(2016)
    exposedJoinedAt?.setUTCFullYear(2027)
    exposedCreatedAt.setUTCFullYear(2028)
    snapshot.dateOfBirth?.setUTCFullYear(2017)
    snapshot.joinedAt?.setUTCFullYear(2029)
    snapshot.createdAt.setUTCFullYear(2030)

    expect(member.dateOfBirth).toEqual(new Date('2010-01-01T00:00:00Z'))
    expect(member.joinedAt).toEqual(new Date('2024-09-01T00:00:00Z'))
  })

  it('allows registration without phone when birth date is provided', () => {
    const [member, event] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    expect(member.phoneNumber).toBeUndefined()
    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: createBirthDate(),
      archived: false,
      createdAt: member.createdAt
    })
    expect(event.payload).toEqual(member.toSnapshot())
  })

  it('normalizes first and last names to lowercase during registration', () => {
    const [member] = Member.register(
      {
        firstName: 'JaNe  ',
        lastName: '  dOe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    expect(member.firstName).toBe('jane')
    expect(member.lastName).toBe('doe')
  })

  it('throws when update input memberId does not match the loaded aggregate id', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    expect(() =>
      Member.update(member, {
        memberId: 'member-2',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      })
    ).toThrow(MemberIdMismatchError)
  })

  it('rehydrates a member without a phone number', () => {
    const createdAt = new Date('2026-03-01T00:00:00Z')
    const member = Member.rehydrate({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: createBirthDate(),
      archived: false,
      createdAt
    })

    expect(member.phoneNumber).toBeUndefined()
    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: createBirthDate(),
      archived: false,
      createdAt
    })
  })

  it('archives a member and emits a snapshot-based archived event', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    const [archivedMember, event] = member.archive()

    expect(archivedMember.isArchived()).toBe(true)
    expect(archivedMember.archivedAt).toBeInstanceOf(Date)
    expect(event.eventName).toBe('member.archived')
    expect(event.payload).toEqual(archivedMember.toSnapshot())
    expect(event.payload.archived).toBe(true)
  })

  it('unarchives a member and clears the archived timestamp', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    const [archivedMember] = member.archive()
    const [unarchivedMember, event] = archivedMember.unarchive()

    expect(unarchivedMember.isArchived()).toBe(false)
    expect(unarchivedMember.archivedAt).toBeUndefined()
    expect(event.eventName).toBe('member.unarchived')
    expect(event.payload).toEqual(unarchivedMember.toSnapshot())
    expect(event.payload.archived).toBe(false)
    expect('archivedAt' in event.payload).toBe(false)
  })

  it('allows updates that clear the phone number', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    const [updatedMember, updateEvent] = Member.update(member, {
      memberId: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: createBirthDate()
    })

    expect(updatedMember.phoneNumber).toBeUndefined()
    expect(updateEvent.payload).toEqual({
      memberId: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: createBirthDate()
    })
  })

  it('rejects registration if birth date is not in the past', () => {
    const futureDate = new Date()
    futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: futureDate
        },
        'member-1'
      )
    ).toThrow(InvalidMemberBirthDateError)
  })

  it('rejects registration if birth date is missing', () => {
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber()
        } as unknown as Parameters<typeof Member.register>[0],
        'member-1'
      )
    ).toThrow(InvalidMemberBirthDateError)
  })

  it('rejects registration if birth date is more than 120 years ago', () => {
    const tooOldDate = new Date()
    tooOldDate.setUTCFullYear(tooOldDate.getUTCFullYear() - 121)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: tooOldDate
        },
        'member-1'
      )
    ).toThrow(InvalidMemberBirthDateError)
  })

  it('allows January 1 in the 120-year boundary year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: new Date('1906-01-01T00:00:00Z')
        },
        'member-1'
      )
    ).not.toThrow()
  })

  it('rejects registration if joined_at is in the future', () => {
    const futureDate = new Date()
    futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate(),
          joinedAt: futureDate
        },
        'member-1'
      )
    ).toThrow(InvalidMemberJoinDateError)
  })

  it('rejects registration if joined_at is before birth date', () => {
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: new Date('2000-01-01T00:00:00Z'),
          joinedAt: new Date('1999-01-01T00:00:00Z')
        },
        'member-1'
      )
    ).toThrow(InvalidMemberJoinDateError)
  })

  it('rejects registration if first name is empty or contains special characters', () => {
    expect(() =>
      Member.register(
        {
          firstName: '',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate()
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    expect(() =>
      Member.register(
        {
          firstName: '   ',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate()
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane!@#',
          lastName: 'Doe',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate()
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)
  })

  it('rejects registration if last name is empty or contains special characters', () => {
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: '',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate()
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: '   ',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate()
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe$%',
          phoneNumber: createPhoneNumber(),
          dateOfBirth: createBirthDate()
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)
  })
})
