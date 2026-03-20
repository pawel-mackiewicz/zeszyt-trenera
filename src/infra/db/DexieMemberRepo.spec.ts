import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Member } from '@/domain/model/member'
import { TrainerNotebookDb } from '@/infra/db'
import { DexieMemberRepo } from '@/infra/db/DexieMemberRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
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
    const event = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
        joinedAt: new Date('2024-09-01T00:00:00Z')
      },
      'member-1'
    )

    await repository.save(event.member)

    const persistedMembers = await database.members.toArray()

    expect(persistedMembers).toHaveLength(1)
    expect(persistedMembers[0]).toMatchObject({
      id: event.member.id,
      firstName: event.member.firstName,
      lastName: event.member.lastName,
      phoneNumber: event.member.phoneNumber,
      dateOfBirth: event.member.dateOfBirth,
      joinedAt: event.member.joinedAt,
      createdAt: event.member.createdAt
    })
  })

  it('reports when no matching member exists yet', async () => {
    await expect(
      repository.existsByNameAndPhone('Jane', 'Doe', '+48123456789')
    ).resolves.toBe(false)
  })

  it('reports when no member exists for the given id', async () => {
    await expect(repository.existsById('member-1')).resolves.toBe(false)
  })

  it('reports when the same name and phone number already exist', async () => {
    const event = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
      },
      'member-1'
    )

    await repository.save(event.member)

    await expect(
      repository.existsByNameAndPhone('Jane', 'Doe', '+48123456789')
    ).resolves.toBe(true)
  })

  it('does not treat a matching phone number with a different name as a duplicate', async () => {
    const event = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
      },
      'member-1'
    )

    await repository.save(event.member)

    await expect(
      repository.existsByNameAndPhone('John', 'Doe', '+48123456789')
    ).resolves.toBe(false)
  })

  it('reports when a member exists for the given id', async () => {
    const event = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
      },
      'member-1'
    )

    await repository.save(event.member)

    await expect(repository.existsById('member-1')).resolves.toBe(true)
  })
})
