import { beforeEach, describe, expect, it } from 'vitest'

import { UnarchiveMemberUseCase } from './UnarchiveMemberUseCase'
import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UnarchiveMemberCommand } from '@/write/members/application/requests/UnarchiveMemberCommand'
import {
  Member,
  MemberNotFoundError,
  MemberUnarchivedDomainEvent,
  type MemberSnapshot
} from '@/write/members/domain/Member'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

describe('UnarchiveMemberUseCase', () => {
  let useCase: UnarchiveMemberUseCase
  let memberRepo: FakeMemberRepo
  let eventRepo: FakeEventRepo

  beforeEach(() => {
    memberRepo = new FakeMemberRepo()
    eventRepo = new FakeEventRepo()
    useCase = new UnarchiveMemberUseCase(
      new FakeUnitOfWork(),
      memberRepo,
      eventRepo
    )
  })

  it('unarchives a loaded member and stores member.unarchived event', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    const input: UnarchiveMemberCommand = {
      memberId: 'member-1'
    }

    await useCase.handle(input)

    expect(memberRepo.updates).toHaveLength(1)
    expect(memberRepo.updates[0]?.isArchived()).toBe(false)
    expect(memberRepo.updates[0]?.archivedAt).toBeUndefined()
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(MemberUnarchivedDomainEvent)
    expect(
      (eventRepo.savedEvents[0] as MemberUnarchivedDomainEvent).payload
    ).toEqual(memberRepo.updates[0]?.toSnapshot())
  })

  it('throws when target member does not exist', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing'
      })
    ).rejects.toThrow(MemberNotFoundError)

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
    archived: true,
    archivedAt: new Date('2026-03-02T00:00:00Z'),
    createdAt: new Date('2026-03-01T00:00:00Z')
  }
}
