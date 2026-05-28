import { beforeEach, describe, expect, it } from 'vitest'

import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import { UpdateMemberUseCase } from '@/write/application/UpdateMemberUseCase'
import type { UpdateMemberCommand } from '@/write/application/requests/UpdateMemberCommand'
import type { DomainEvent } from '@/write/domain/events/DomainEvent'
import {
  MemberNotFoundError,
  MemberUpdatedDomainEvent
} from '@/write/domain/model/Member'
import { Member, type MemberSnapshot } from '@/write/domain/model/Member'
import { InvalidPhoneNumberError } from '@/write/domain/model/vo/PhoneNumber'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeMemberRepo implements MemberRepoPort {
  public readonly updates: Member[] = []
  public membersById = new Map<string, Member>()

  async save(_member: Member): Promise<void> {
    throw new Error('Not implemented in this test')
  }

  async update(member: Member): Promise<void> {
    this.updates.push(member)
  }

  async delete(_memberId: string): Promise<void> {
    throw new Error('Not implemented in this test')
  }

  async findById(memberId: string): Promise<Member | null> {
    return this.membersById.get(memberId) ?? null
  }

  async existsById(memberId: string): Promise<boolean> {
    return this.membersById.has(memberId)
  }

  async existsByNameAndBirthDate(
    _firstName: string,

    _lastName: string,

    _dateOfBirth: Date
  ): Promise<boolean> {
    return false
  }
}

class FakeEventRepo implements EventRepoPort {
  public readonly savedEvents: DomainEvent[] = []

  async save(event: DomainEvent): Promise<void> {
    this.savedEvents.push(event)
  }
}

describe('UpdateMemberUseCase', () => {
  let useCase: UpdateMemberUseCase
  let memberRepo: FakeMemberRepo
  let eventRepo: FakeEventRepo

  beforeEach(() => {
    memberRepo = new FakeMemberRepo()
    eventRepo = new FakeEventRepo()
    useCase = new UpdateMemberUseCase(
      new FakeUnitOfWork(),
      memberRepo,
      eventRepo
    )
  })

  it('updates member identity and stores member.updated event', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    const input: UpdateMemberCommand = {
      memberId: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    }

    await useCase.handle(input)

    expect(memberRepo.updates).toEqual([
      expect.objectContaining({
        id: 'member-1',
        firstName: 'jane',
        lastName: 'doe'
      })
    ])
    expect(memberRepo.updates[0]?.phoneNumber?.value).toBe('+48123456789')
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(MemberUpdatedDomainEvent)
  })

  it('throws when target member does not exist', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48 123 456 789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      })
    ).rejects.toThrow(MemberNotFoundError)

    expect(memberRepo.updates).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('allows updates when identity does not change', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    await expect(
      useCase.handle({
        memberId: 'member-1',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      })
    ).resolves.toBeUndefined()
    expect(memberRepo.updates).toHaveLength(1)
  })

  it('clears the stored phone number when the update input is blank', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    await useCase.handle({
      memberId: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '   ',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    })

    expect(memberRepo.updates).toHaveLength(1)
    expect(memberRepo.updates[0]?.phoneNumber).toBeUndefined()
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(MemberUpdatedDomainEvent)
    expect(
      (eventRepo.savedEvents[0] as MemberUpdatedDomainEvent).payload
    ).toEqual({
      memberId: 'member-1',
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    })
  })

  it('rejects invalid non-empty phone numbers during update', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    await expect(
      useCase.handle({
        memberId: 'member-1',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '123456789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      })
    ).rejects.toThrow(InvalidPhoneNumberError)

    expect(memberRepo.updates).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})

function memberSnapshot(): MemberSnapshot {
  return {
    id: 'member-1',
    firstName: 'jane',
    lastName: 'doe',
    phoneNumber: '+48111111111',
    dateOfBirth: new Date('2010-01-01T00:00:00Z'),
    createdAt: new Date('2026-03-01T00:00:00Z')
  }
}
