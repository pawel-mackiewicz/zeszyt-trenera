import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RegisterMemberUseCase } from './RegisterMemberUseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterMemberCommand } from '@/application/requests/RegisterMemberCommand'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import { InvalidPhoneNumberError } from '@/domain/model/vo/PhoneNumber'
import {
  InvalidMemberBirthDateError,
  Member,
  MemberAlreadyExistsError,
  MemberCreatedDomainEvent
} from '@/domain/model/Member'

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
    dateOfBirth: Date
  }> = []
  public existingIdentity:
    | {
        firstName: string
        lastName: string
        dateOfBirth: Date
      }
    | undefined

  async save(member: Member): Promise<void> {
    this.savedMembers.push(member)
  }

  async update(_member: Member): Promise<void> {
    throw new Error('Not implemented in this test')
  }

  async findById(): Promise<Member | null> {
    return null
  }

  async existsById(memberId: string): Promise<boolean> {
    return this.savedMembers.some((member) => member.id === memberId)
  }

  async existsByNameAndBirthDate(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ): Promise<boolean> {
    this.existsChecks.push({
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth.getTime())
    })

    return (
      (this.existingIdentity?.firstName === firstName &&
        this.existingIdentity?.lastName === lastName &&
        this.existingIdentity?.dateOfBirth.getTime() ===
          dateOfBirth.getTime()) ||
      this.savedMembers.some(
        (member) =>
          member.firstName === firstName &&
          member.lastName === lastName &&
          member.dateOfBirth?.getTime() === dateOfBirth.getTime()
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
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      }
    ])
    expect(uow.execute).toHaveBeenCalledTimes(1)

    expect(memberRepo.savedMembers).toHaveLength(1)
    const savedMember = memberRepo.savedMembers[0]
    expect(savedMember.firstName).toBe('jane')
    expect(savedMember.lastName).toBe('doe')
    expect(savedMember.phoneNumber?.value).toBe('+48123456789')
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
        phoneNumber: '123456789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      })
    ).rejects.toThrow(InvalidPhoneNumberError)

    expect(memberRepo.existsChecks).toHaveLength(0)
    expect(uow.execute).not.toHaveBeenCalled()
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(memberRepo.savedMembers).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('throws before opening the unit of work when birth date is missing at runtime', async () => {
    await expect(
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe'
      } as unknown as RegisterMemberCommand)
    ).rejects.toThrow(InvalidMemberBirthDateError)

    expect(memberRepo.existsChecks).toHaveLength(0)
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toEqual(['member-generated-by-test'])
    expect(memberRepo.savedMembers).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('registers a member without phone and still checks duplicates by birth date', async () => {
    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '   ',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    })

    expect(memberRepo.existsChecks).toEqual([
      {
        firstName: 'jane',
        lastName: 'doe',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      }
    ])
    expect(memberRepo.savedMembers).toHaveLength(1)
    expect(memberRepo.savedMembers[0]?.phoneNumber).toBeUndefined()
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(
      (eventRepo.savedEvents[0] as MemberCreatedDomainEvent).payload
    ).toEqual(
      expect.not.objectContaining({
        phoneNumber: expect.anything()
      })
    )
  })

  it('treats an explicit null phone number as an absent phone', async () => {
    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: null,
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    })

    expect(memberRepo.existsChecks).toEqual([
      {
        firstName: 'jane',
        lastName: 'doe',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      }
    ])
    expect(memberRepo.savedMembers).toHaveLength(1)
    expect(memberRepo.savedMembers[0]?.phoneNumber).toBeUndefined()
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(
      (eventRepo.savedEvents[0] as MemberCreatedDomainEvent).payload
    ).toEqual(
      expect.not.objectContaining({
        phoneNumber: expect.anything()
      })
    )
  })

  it('throws when trying to register the same member identity twice', async () => {
    memberRepo.existingIdentity = {
      firstName: 'jane',
      lastName: 'doe',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    }

    await expect(
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48 123 456 789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      })
    ).rejects.toThrow(MemberAlreadyExistsError)

    expect(memberRepo.existsChecks).toEqual([
      {
        firstName: 'jane',
        lastName: 'doe',
        dateOfBirth: new Date('2010-01-01T00:00:00Z')
      }
    ])
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(1)
    expect(memberRepo.savedMembers).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('allows the same normalized name when the birth date differs', async () => {
    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    })

    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: null,
      dateOfBirth: new Date('2011-01-01T00:00:00Z')
    })

    expect(memberRepo.savedMembers).toHaveLength(2)
    expect(eventRepo.savedEvents).toHaveLength(2)
  })

  it('rejects a concurrent second registration for the same normalized identity', async () => {
    const dto: RegisterMemberCommand = {
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    }

    const results = await Promise.allSettled([
      useCase.handle(dto),
      useCase.handle({
        ...dto,
        phoneNumber: null
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
