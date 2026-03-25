import { describe, expect, it } from 'vitest'

import {
  InvalidMemberPhoneNumberError,
  Member,
  MemberCreatedDomainEvent,
  InvalidMemberBirthDateError,
  InvalidMemberJoinDateError,
  InvalidMemberNameError
} from '@/domain/model/member'

describe('Member Model', () => {
  it('should create a member with all required properties', () => {
    const id = 'member-1'
    const beforeCreation = new Date()

    // Passing the ID explicitly proves the aggregate follows the same boundary as the other models and does not generate identifiers on its own.
    const [member, event] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
      },
      id
    )

    const afterCreation = new Date()

    expect(member.id).toBe(id)
    expect(member.firstName).toBe('jane')
    expect(member.lastName).toBe('doe')
    expect(member.phoneNumber).toBe('+48123456789')

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
      createdAt: member.createdAt
    })

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
    expect(event).toBeInstanceOf(MemberCreatedDomainEvent)
    // The raw payload is now the canonical event contract so future persistence adapters can store the snapshot without wrapper-specific mapping.
    expect(event.payload).toEqual(member.toSnapshot())
    expect(event.payload).toEqual(member.toSnapshot())
  })

  it('restores an existing member from persisted state', () => {
    const member = Member.restore({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })

    expect(member).toBeInstanceOf(Member)
    expect(member).toMatchObject({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })
    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })
  })

  it('toSnapshot omits optional date fields when the member does not have them', () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
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
      createdAt: member.createdAt
    })
    expect('dateOfBirth' in snapshot).toBe(false)
    expect('joinedAt' in snapshot).toBe(false)
  })

  it('toSnapshot includes optional date fields when the member has them', () => {
    const member = Member.restore({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })

    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })
  })

  it('keeps date fields immutable when callers mutate shared references', () => {
    const dateOfBirth = new Date('2010-01-01T00:00:00Z')
    const joinedAt = new Date('2024-09-01T00:00:00Z')
    const createdAt = new Date('2024-10-01T00:00:00Z')
    const member = Member.restore({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789',
      dateOfBirth,
      joinedAt,
      createdAt
    })

    // Mutating caller-owned dates after restore must not rewrite aggregate state through shared objects.
    dateOfBirth.setUTCFullYear(2015)
    joinedAt.setUTCFullYear(2025)
    createdAt.setUTCFullYear(2026)

    expect(member.dateOfBirth).toEqual(new Date('2010-01-01T00:00:00Z'))
    expect(member.joinedAt).toEqual(new Date('2024-09-01T00:00:00Z'))
    expect(member.createdAt).toEqual(new Date('2024-10-01T00:00:00Z'))

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
    expect(member.createdAt).toEqual(new Date('2024-10-01T00:00:00Z'))
  })

  it('rejects non-E.164 phone numbers during registration', () => {
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+48 123 456 789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberPhoneNumberError)
  })

  it('rejects non-E.164 phone numbers during restore', () => {
    expect(() =>
      Member.restore({
        id: 'member-1',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '12345',
        createdAt: new Date('2024-10-01T00:00:00Z')
      })
    ).toThrow(InvalidMemberPhoneNumberError)
  })

  it('normalizes first and last names to lowercase during registration', () => {
    const [member] = Member.register(
      {
        firstName: 'JaNe  ',
        lastName: '  dOe',
        phoneNumber: '+48123456789'
      },
      'member-1'
    )

    expect(member.firstName).toBe('jane')
    expect(member.lastName).toBe('doe')
  })

  it('rejects registration if birth date is not in the past', () => {
    const futureDate = new Date()
    futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+48123456789',
          dateOfBirth: futureDate
        },
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
          phoneNumber: '+48123456789',
          dateOfBirth: tooOldDate
        },
        'member-1'
      )
    ).toThrow(InvalidMemberBirthDateError)
  })

  it('rejects registration if joined_at is in the future', () => {
    const futureDate = new Date()
    futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1)

    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '+48123456789',
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
          phoneNumber: '+48123456789',
          dateOfBirth: new Date('2000-01-01T00:00:00Z'),
          joinedAt: new Date('1999-01-01T00:00:00Z')
        },
        'member-1'
      )
    ).toThrow(InvalidMemberJoinDateError)
  })

  it('rejects registration if first name is empty or contains special characters', () => {
    // Empty
    expect(() =>
      Member.register(
        {
          firstName: '',
          lastName: 'Doe',
          phoneNumber: '+48123456789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    // Whitespace
    expect(() =>
      Member.register(
        {
          firstName: '   ',
          lastName: 'Doe',
          phoneNumber: '+48123456789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    // Special characters
    expect(() =>
      Member.register(
        {
          firstName: 'Jane!@#',
          lastName: 'Doe',
          phoneNumber: '+48123456789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)
  })

  it('rejects registration if last name is empty or contains special characters', () => {
    // Empty
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: '',
          phoneNumber: '+48123456789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    // Whitespace
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: '   ',
          phoneNumber: '+48123456789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)

    // Special characters
    expect(() =>
      Member.register(
        {
          firstName: 'Jane',
          lastName: 'Doe$%',
          phoneNumber: '+48123456789'
        },
        'member-1'
      )
    ).toThrow(InvalidMemberNameError)
  })
})
