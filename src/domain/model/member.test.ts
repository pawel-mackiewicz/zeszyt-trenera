import { describe, expect, it } from 'vitest'

import { InvalidMemberPhoneNumberError, Member } from '@/domain/model/member'

describe('Member Model', () => {
  it('should create a member with all required properties', () => {
    const id = 'member-1'
    const beforeCreation = new Date()

    // Passing the ID explicitly proves the aggregate follows the same boundary as the other models and does not generate identifiers on its own.
    const event = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
      },
      id
    )

    const afterCreation = new Date()

    expect(event.member.id).toBe(id)
    expect(event.member.firstName).toBe('Jane')
    expect(event.member.lastName).toBe('Doe')
    expect(event.member.phoneNumber).toBe('+48123456789')

    expect(event.member.createdAt).toBeDefined()
    expect(event.member.createdAt).toBeInstanceOf(Date)
    expect(event.member.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(event.member.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )

    expect(event.member.toSnapshot()).toEqual({
      id,
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      createdAt: event.member.createdAt
    })

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
  })

  it('restores an existing member from persisted state', () => {
    const member = Member.restore({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })

    expect(member).toBeInstanceOf(Member)
    expect(member).toMatchObject({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })
    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })
  })

  it('toSnapshot omits optional date fields when the member does not have them', () => {
    const member = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
      },
      'member-1'
    ).member

    const snapshot = member.toSnapshot()

    // Persisted snapshots should omit absent optional dates so local records do not accumulate meaningless undefined keys.
    expect(snapshot).toEqual({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      createdAt: member.createdAt
    })
    expect('dateOfBirth' in snapshot).toBe(false)
    expect('joinedAt' in snapshot).toBe(false)
  })

  it('toSnapshot includes optional date fields when the member has them', () => {
    const member = Member.restore({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z'),
      createdAt: new Date('2024-10-01T00:00:00Z')
    })

    expect(member.toSnapshot()).toEqual({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
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
      firstName: 'Jane',
      lastName: 'Doe',
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
})
