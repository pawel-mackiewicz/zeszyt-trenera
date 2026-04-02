import { beforeEach, describe, expect, it } from 'vitest'

import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import { UpdateMemberUseCase } from '@/application/UpdateMemberUseCase'
import type { UpdateMemberCommand } from '@/application/requests/UpdateMemberCommand'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import {
  MemberNotFoundError,
  MemberUpdatedDomainEvent
} from '@/domain/model/member'
import { Member, type MemberSnapshot } from '@/domain/model/member'
import { type PhoneNumber } from '@/domain/model/vo/PhoneNumber'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeMemberRepo implements MemberRepoPort {
  public readonly updates: Member[] = []
  public membersById = new Map<string, Member>()

  async save(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- This fake only satisfies the repository contract for a use case that does not call save.
    _member: Member
  ): Promise<void> {
    throw new Error('Not implemented in this test')
  }

  async update(member: Member): Promise<void> {
    this.updates.push(member)
  }

  async findById(memberId: string): Promise<Member | null> {
    return this.membersById.get(memberId) ?? null
  }

  async existsById(memberId: string): Promise<boolean> {
    return this.membersById.has(memberId)
  }

  async existsByNameAndPhone(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- UpdateMemberUseCase no longer depends on duplicate checks.
    _firstName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- UpdateMemberUseCase no longer depends on duplicate checks.
    _lastName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- UpdateMemberUseCase no longer depends on duplicate checks.
    _phoneNumber: PhoneNumber
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
      phoneNumber: '+48 123 456 789'
    }

    await useCase.handle(input)

    expect(memberRepo.updates).toEqual([
      expect.objectContaining({
        id: 'member-1',
        firstName: 'jane',
        lastName: 'doe'
      })
    ])
    expect(memberRepo.updates[0]?.phoneNumber.value).toBe('+48123456789')
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(MemberUpdatedDomainEvent)
  })

  it('throws when target member does not exist', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48 123 456 789'
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
        phoneNumber: '+48 111 111 111'
      })
    ).resolves.toBeUndefined()
    expect(memberRepo.updates).toHaveLength(1)
  })
})

function memberSnapshot(): MemberSnapshot {
  return {
    id: 'member-1',
    firstName: 'jane',
    lastName: 'doe',
    phoneNumber: '+48111111111',
    createdAt: new Date('2026-03-01T00:00:00Z')
  }
}
