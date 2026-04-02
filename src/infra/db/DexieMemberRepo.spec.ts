import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Member } from '@/domain/model/member'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'
import { TrainerNotebookDb } from '@/db'
import { DexieMemberRepo } from '@/infra/db/DexieMemberRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

function createPhoneNumber(rawPhoneNumber = '+48123456789') {
  return PhoneNumber.create(rawPhoneNumber)
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
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
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
      phoneNumber: member.phoneNumber.value,
      dateOfBirth: member.dateOfBirth,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt
    })
  })

  it('persists name in lower case regardless of input casing', async () => {
    const [member] = Member.register(
      {
        firstName: 'JaNe',
        lastName: 'dOe',
        phoneNumber: createPhoneNumber()
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
      repository.existsByNameAndPhone('Jane', 'Doe', createPhoneNumber())
    ).resolves.toBe(false)
  })

  it('reports when no member exists for the given id', async () => {
    await expect(repository.existsById('member-1')).resolves.toBe(false)
  })

  it('reports when the same name and phone number already exist', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber()
      },
      'member-1'
    )

    await repository.save(member)

    await expect(
      repository.existsByNameAndPhone('jane', 'doe', createPhoneNumber())
    ).resolves.toBe(true)
  })

  it('does not treat a matching phone number with a different name as a duplicate', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber()
      },
      'member-1'
    )

    await repository.save(member)

    await expect(
      repository.existsByNameAndPhone('john', 'doe', createPhoneNumber())
    ).resolves.toBe(false)
  })

  it('reports when a member exists for the given id', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber()
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
        phoneNumber: createPhoneNumber()
      },
      'member-1'
    )
    await repository.save(member)

    const [updatedMember] = Member.update(member, {
      memberId: member.id,
      firstName: 'Janet',
      lastName: 'Doe',
      phoneNumber: PhoneNumber.create('+48111222333')
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
        phoneNumber: createPhoneNumber()
      },
      'member-1'
    )
    await repository.save(member)

    const loaded = await repository.findById('member-1')

    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('member-1')
    expect(loaded?.phoneNumber.value).toBe('+48123456789')
  })

  it('checks duplicate identity lookup by name and phone', async () => {
    const [memberOne] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: createPhoneNumber()
      },
      'member-1'
    )
    await repository.save(memberOne)

    await expect(
      repository.existsByNameAndPhone('jane', 'doe', createPhoneNumber())
    ).resolves.toBe(true)
  })
})
