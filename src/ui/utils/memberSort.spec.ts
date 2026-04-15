import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersistedMember } from '@/write/infra'
import { sortMembers } from '@/ui/utils/memberSort'

describe('memberSort', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sorts by first name with deterministic tie-breakers', () => {
    const members: PersistedMember[] = [
      {
        id: 'member-1',
        firstName: 'zane',
        lastName: 'beta',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-2',
        firstName: 'adam',
        lastName: 'zulu',
        dateOfBirth: new Date('1991-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-3',
        firstName: 'adam',
        lastName: 'alpha',
        dateOfBirth: new Date('1992-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      }
    ]

    const asc = sortMembers(members, {
      field: 'firstName',
      direction: 'asc',
      locale: 'en'
    })
    const desc = sortMembers(members, {
      field: 'firstName',
      direction: 'desc',
      locale: 'en'
    })

    expect(
      asc.map((member) => `${member.firstName} ${member.lastName}`)
    ).toEqual(['adam alpha', 'adam zulu', 'zane beta'])
    expect(
      desc.map((member) => `${member.firstName} ${member.lastName}`)
    ).toEqual(['zane beta', 'adam alpha', 'adam zulu'])
  })

  it('sorts by birth date with deterministic order in both directions', () => {
    const members: PersistedMember[] = [
      {
        id: 'member-1',
        firstName: 'zoe',
        lastName: 'beta',
        dateOfBirth: new Date('1994-02-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-2',
        firstName: 'adam',
        lastName: 'alpha',
        dateOfBirth: new Date('1994-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-3',
        firstName: 'mike',
        lastName: 'zeta',
        dateOfBirth: new Date('1986-03-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-4',
        firstName: 'no',
        lastName: 'birthdate',
        dateOfBirth: new Date('2000-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      }
    ]

    const asc = sortMembers(members, {
      field: 'dateOfBirth',
      direction: 'asc',
      locale: 'en'
    })
    const desc = sortMembers(members, {
      field: 'dateOfBirth',
      direction: 'desc',
      locale: 'en'
    })

    expect(asc.map((member) => member.id)).toEqual([
      'member-3',
      'member-2',
      'member-1',
      'member-4'
    ])
    expect(desc.map((member) => member.id)).toEqual([
      'member-4',
      'member-1',
      'member-2',
      'member-3'
    ])
  })

  it('sorts by last name direction while keeping first-name tie-breakers ascending', () => {
    const members: PersistedMember[] = [
      {
        id: 'member-1',
        firstName: 'zoe',
        lastName: 'zulu',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-2',
        firstName: 'adam',
        lastName: 'zulu',
        dateOfBirth: new Date('1991-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      },
      {
        id: 'member-3',
        firstName: 'mike',
        lastName: 'alpha',
        dateOfBirth: new Date('1992-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z')
      }
    ]

    const desc = sortMembers(members, {
      field: 'lastName',
      direction: 'desc',
      locale: 'en'
    })

    expect(desc.map((member) => member.id)).toEqual([
      'member-2',
      'member-1',
      'member-3'
    ])
  })
})
