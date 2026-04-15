import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Member } from '@/write/domain/model/Member'
import { PhoneNumber } from '@/write/domain/model/vo/PhoneNumber'
import { TrainerNotebookDb } from '@/db'
import { DexieMemberRepo } from '@/write/infra/db/DexieMemberRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

function createPhoneNumber(rawPhoneNumber = '+48123456789') {
  return PhoneNumber.create(rawPhoneNumber)
}

function createBirthDate(rawBirthDate = '2010-01-01T00:00:00Z') {
  return new Date(rawBirthDate)
}

describe('DexieMemberRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieMemberRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('member-repo'))
    repository = new DexieMemberRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists a member into Dexie', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate(),
        joinedAt: new Date('2024-09-01T00:00:00Z')
      },
      'member-1'
    )

    await repository.save(member)

    const persistedMembers = await database.members.toArray()

    expect(persistedMembers).toHaveLength(1)
    expect(persistedMembers[0]).toMatchObject({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber?.value,
      dateOfBirth: member.dateOfBirth,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt
    })
  })

  it('omits the persisted phone field when the member does not have one', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    await repository.save(member)

    const persistedMember = await database.members.get(member.id)

    expect(persistedMember).toEqual({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      dateOfBirth: member.dateOfBirth,
      createdAt: member.createdAt
    })
    expect(persistedMember && 'phoneNumber' in persistedMember).toBe(false)
  })

  it('persists name in lower case regardless of input casing', async () => {
    const [member] = Member.register(
      {
        firstName: 'JaNe',
        lastName: 'dOe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    await repository.save(member)

    const persistedMembers = await database.members.toArray()

    expect(persistedMembers).toHaveLength(1)
    expect(persistedMembers[0].firstName).toBe('jane')
    expect(persistedMembers[0].lastName).toBe('doe')
  })

  it('reports when no matching member exists yet', async () => {
    await expect(
      repository.existsByNameAndBirthDate('Jane', 'Doe', createBirthDate())
    ).resolves.toBe(false)
  })

  it('reports when no member exists for the given id', async () => {
    await expect(repository.existsById('member-1')).resolves.toBe(false)
  })

  it('reports when the same name and birth date already exist', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    await repository.save(member)

    await expect(
      repository.existsByNameAndBirthDate('jane', 'doe', createBirthDate())
    ).resolves.toBe(true)
  })

  it('does not treat a matching birth date with a different name as a duplicate', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    await repository.save(member)

    await expect(
      repository.existsByNameAndBirthDate('john', 'doe', createBirthDate())
    ).resolves.toBe(false)
  })

  it('does not treat the same normalized name with a different birth date as a duplicate', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    await repository.save(member)

    await expect(
      repository.existsByNameAndBirthDate(
        'jane',
        'doe',
        createBirthDate('2011-01-01T00:00:00Z')
      )
    ).resolves.toBe(false)
  })

  it('reports when a member exists for the given id', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )

    await repository.save(member)

    await expect(repository.existsById('member-1')).resolves.toBe(true)
  })

  it('updates an existing member while preserving createdAt', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )
    await repository.save(member)

    const [updatedMember] = Member.update(member, {
      memberId: member.id,
      firstName: 'Janet',
      lastName: 'Doe',
      phoneNumber: PhoneNumber.create('+48111222333'),
      dateOfBirth: member.dateOfBirth
    })

    await repository.update(updatedMember)

    const persisted = await database.members.get(member.id)
    expect(persisted).toMatchObject({
      id: member.id,
      firstName: 'janet',
      lastName: 'doe',
      phoneNumber: '+48111222333',
      createdAt: member.createdAt
    })
  })

  it('rehydrates a member aggregate by id', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )
    await repository.save(member)

    const loaded = await repository.findById('member-1')

    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('member-1')
    expect(loaded?.phoneNumber?.value).toBe('+48123456789')
    expect(loaded?.dateOfBirth).toEqual(createBirthDate())
  })

  it('rehydrates a member aggregate without a phone when the row omits it', async () => {
    await database.members.add({
      id: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: createBirthDate(),
      createdAt: new Date('2026-03-01T00:00:00Z')
    })

    const loaded = await repository.findById('member-1')

    expect(loaded).not.toBeNull()
    expect(loaded?.phoneNumber).toBeUndefined()
  })

  it('checks duplicate identity lookup by name and birth date', async () => {
    const [memberOne] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber(),
        dateOfBirth: createBirthDate()
      },
      'member-1'
    )
    await repository.save(memberOne)

    await expect(
      repository.existsByNameAndBirthDate('jane', 'doe', createBirthDate())
    ).resolves.toBe(true)
  })
})
