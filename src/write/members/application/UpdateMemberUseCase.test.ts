import { beforeEach, describe, expect, it } from 'vitest'

import { FakeEventRepo } from '@/write/shared/events/EventRepoPort'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import { UpdateMemberUseCase } from '@/write/members/application/UpdateMemberUseCase'
import type { UpdateMemberCommand } from '@/write/members/application/requests/UpdateMemberCommand'
import {
  MemberNotFoundError,
  MemberUpdatedDomainEvent
} from '@/write/members/domain/Member'
import { Member, type MemberSnapshot } from '@/write/members/domain/Member'
import { InvalidPhoneNumberError } from '@/write/shared/vo/PhoneNumber'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
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
    archived: false,
    createdAt: new Date('2026-03-01T00:00:00Z')
  }
}
