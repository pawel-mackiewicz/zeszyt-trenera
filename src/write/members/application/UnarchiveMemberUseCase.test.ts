import { beforeEach, describe, expect, it } from 'vitest'

import { UnarchiveMemberUseCase } from './UnarchiveMemberUseCase'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UnarchiveMemberCommand } from '@/write/members/application/requests/UnarchiveMemberCommand'
import {
  Member,
  MemberNotFoundError,
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

  beforeEach(() => {
    memberRepo = new FakeMemberRepo()
    useCase = new UnarchiveMemberUseCase(new FakeUnitOfWork(), memberRepo)
  })

  it('saves the restored member', async () => {
    memberRepo.membersById.set('member-1', Member.rehydrate(memberSnapshot()))

    const input: UnarchiveMemberCommand = {
      memberId: 'member-1'
    }

    await useCase.handle(input)

    expect(memberRepo.updates).toHaveLength(1)
    expect(memberRepo.updates[0]?.isArchived()).toBe(false)
    expect(memberRepo.updates[0]?.archivedAt).toBeUndefined()
  })

  it('throws when target member does not exist', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing'
      })
    ).rejects.toThrow(MemberNotFoundError)

    expect(memberRepo.updates).toHaveLength(0)
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
