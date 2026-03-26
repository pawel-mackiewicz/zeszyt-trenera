import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RegisterMemberUseCase } from './RegisterMemberUseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterMemberCommand } from '@/application/requests/RegisterMemberCommand'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import {
  InvalidPhoneNumberError,
  type PhoneNumber
} from '@/domain/model/vo/PhoneNumber'
import {
  Member,
  MemberAlreadyExistsError,
  MemberCreatedDomainEvent
} from '@/domain/model/member'

class FakeUnitOfWork implements UnitOfWork {
  private current: Promise<void> = Promise.resolve()

  async execute<T>(action: () => Promise<T>): Promise<T> {
    const run = this.current.then(action, action)

    this.current = run.then(
      () => undefined,
      () => undefined
    )

    return await run
  }
}

class FakeMemberRepo implements MemberRepoPort {
  public readonly savedMembers: Member[] = []
  public readonly existsChecks: Array<{
    firstName: string
    lastName: string
    phoneNumber: string
  }> = []
  public existingIdentity:
    | {
        firstName: string
        lastName: string
        phoneNumber: string
      }
    | undefined

  async save(member: Member): Promise<void> {
    this.savedMembers.push(member)
  }

  async existsById(memberId: string): Promise<boolean> {
    return this.savedMembers.some((member) => member.id === memberId)
  }

  async existsByNameAndPhone(
    firstName: string,
    lastName: string,
    phoneNumber: PhoneNumber
  ): Promise<boolean> {
    this.existsChecks.push({
      firstName,
      lastName,
      phoneNumber: phoneNumber.value
    })

    return (
      (this.existingIdentity?.firstName === firstName &&
        this.existingIdentity?.lastName === lastName &&
        this.existingIdentity?.phoneNumber === phoneNumber.value) ||
      this.savedMembers.some(
        (member) =>
          member.firstName === firstName &&
          member.lastName === lastName &&
          member.phoneNumber.value === phoneNumber.value
      )
    )
  }
}

class FakeEventRepo implements EventRepoPort {
  public readonly savedEvents: DomainEvent[] = []

  async save(event: DomainEvent): Promise<void> {
    this.savedEvents.push(event)
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  public readonly generatedIds: string[] = []

  generate(): string {
    const id = 'member-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterMemberUseCase', () => {
  let uow: FakeUnitOfWork
  let memberRepo: FakeMemberRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterMemberUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    memberRepo = new FakeMemberRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterMemberUseCase(uow, memberRepo, eventRepo, idGenerator)
  })

  it('registers a member via UoW, saving the member and the related domain event', async () => {
    const dto: RegisterMemberCommand = {
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z')
    }

    await useCase.handle(dto)

    expect(memberRepo.existsChecks).toEqual([
      {
        firstName: 'jane',
        lastName: 'doe',
        phoneNumber: '+48123456789'
      }
    ])
    expect(uow.execute).toHaveBeenCalledTimes(1)

    expect(memberRepo.savedMembers).toHaveLength(1)
    const savedMember = memberRepo.savedMembers[0]
    expect(savedMember.firstName).toBe('jane')
    expect(savedMember.lastName).toBe('doe')
    expect(savedMember.phoneNumber.value).toBe('+48123456789')
    expect(savedMember.dateOfBirth).toEqual(new Date('2010-01-01T00:00:00Z'))
    expect(savedMember.joinedAt).toEqual(new Date('2024-09-01T00:00:00Z'))
    // The fixed ID proves the workflow consumes the injected generator instead of letting the aggregate allocate infrastructure identifiers.
    expect(savedMember.id).toBe('member-generated-by-test')
    expect(idGenerator.generatedIds).toEqual(['member-generated-by-test'])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('member.created')
    // The assertion narrows to the concrete event type so the test documents that the event log stores a snapshot payload, not the mutable aggregate instance itself.
    expect(savedEvent).toBeInstanceOf(MemberCreatedDomainEvent)
    expect((savedEvent as MemberCreatedDomainEvent).payload).toEqual(
      savedMember.toSnapshot()
    )
  })

  it('throws when the phone number value object cannot normalize the input', async () => {
    await expect(
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '123456789'
      })
    ).rejects.toThrow(InvalidPhoneNumberError)

    expect(memberRepo.existsChecks).toHaveLength(0)
    expect(uow.execute).not.toHaveBeenCalled()
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(memberRepo.savedMembers).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('throws when trying to register the same member identity twice', async () => {
    memberRepo.existingIdentity = {
      firstName: 'jane',
      lastName: 'doe',
      phoneNumber: '+48123456789'
    }

    await expect(
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48 123 456 789'
      })
    ).rejects.toThrow(MemberAlreadyExistsError)

    expect(memberRepo.existsChecks).toEqual([
      {
        firstName: 'jane',
        lastName: 'doe',
        phoneNumber: '+48123456789'
      }
    ])
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(memberRepo.savedMembers).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('rejects a concurrent second registration for the same normalized identity', async () => {
    const dto: RegisterMemberCommand = {
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789'
    }

    const results = await Promise.allSettled([
      useCase.handle(dto),
      useCase.handle({
        ...dto,
        phoneNumber: '+48123456789'
      })
    ])

    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === 'rejected')
    ).toHaveLength(1)
    expect(
      results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )?.reason
    ).toBeInstanceOf(MemberAlreadyExistsError)
    expect(memberRepo.savedMembers).toHaveLength(1)
    expect(eventRepo.savedEvents).toHaveLength(1)
  })
})
