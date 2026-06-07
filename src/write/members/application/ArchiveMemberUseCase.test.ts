import { beforeEach, describe, expect, it } from 'vitest'

import { ArchiveMemberUseCase } from './ArchiveMemberUseCase'
import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { ArchiveMemberCommand } from '@/write/members/application/requests/ArchiveMemberCommand'
import {
  Member,
  MemberArchivedDomainEvent,
  MemberNotFoundError,
  type MemberSnapshot
} from '@/write/members/domain/Member'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

describe('ArchiveMemberUseCase', () => {
  let useCase: ArchiveMemberUseCase
  let memberRepo: FakeMemberRepo
  let eventRepo: FakeEventRepo

  beforeEach(() => {
    memberRepo = new FakeMemberRepo()
    eventRepo = new FakeEventRepo()
    useCase = new ArchiveMemberUseCase(
      new FakeUnitOfWork(),
      memberRepo,
      eventRepo
    )
  })

  it('archives a loaded member and stores member.archived event', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    const input: ArchiveMemberCommand = {
      memberId: 'member-1'
    }

    await useCase.handle(input)

    expect(memberRepo.updates).toHaveLength(1)
    expect(memberRepo.updates[0]?.isArchived()).toBe(true)
    expect(memberRepo.updates[0]?.archivedAt).toBeInstanceOf(Date)
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(MemberArchivedDomainEvent)
    expect(
      (eventRepo.savedEvents[0] as MemberArchivedDomainEvent).payload
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
    archived: false,
    createdAt: new Date('2026-03-01T00:00:00Z')
  }
}
