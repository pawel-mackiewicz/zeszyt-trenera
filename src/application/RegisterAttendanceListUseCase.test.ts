import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RegisterAttendanceListUseCase } from './RegisterAttendanceListUseCase'
import type { RegisterAttendanceListCommand } from '@/application/requests/RegisterAttendanceListCommand'
import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import {
  AttendanceList,
  AttendanceListAlreadyExistsError,
  AttendanceListRecordedDomainEvent
} from '@/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/domain/model/Member'
import type { Member } from '@/domain/model/Member'

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
  public readonly existsByIdChecks: string[] = []
  public existingMemberIds = new Set<string>()

  async save(_member: Member): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async update(_member: Member): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async findById(): Promise<Member | null> {
    return null
  }

  async existsById(memberId: string): Promise<boolean> {
    this.existsByIdChecks.push(memberId)
    return this.existingMemberIds.has(memberId)
  }

  async existsByNameAndBirthDate(
    _firstName: string,

    _lastName: string,

    _dateOfBirth: Date
  ): Promise<boolean> {
    return false
  }
}

class FakeAttendanceListRepo implements AttendanceListRepoPort {
  public readonly savedAttendanceLists: AttendanceList[] = []
  public readonly existsByStartChecks: Date[] = []
  public existingStarts = new Set<number>()

  async findById(): Promise<AttendanceList | null> {
    return null
  }

  async save(attendanceList: AttendanceList): Promise<void> {
    this.savedAttendanceLists.push(attendanceList)
  }

  async update(_attendanceList: AttendanceList): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async existsByStart(start: Date): Promise<boolean> {
    this.existsByStartChecks.push(new Date(start.getTime()))

    return (
      this.existingStarts.has(start.getTime()) ||
      this.savedAttendanceLists.some(
        (attendanceList) => attendanceList.start.getTime() === start.getTime()
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
    const id = 'attendance-list-generated-by-test'
    this.generatedIds.push(id)
    return id
  }
}

describe('RegisterAttendanceListUseCase', () => {
  let uow: FakeUnitOfWork
  let memberRepo: FakeMemberRepo
  let attendanceListRepo: FakeAttendanceListRepo
  let eventRepo: FakeEventRepo
  let idGenerator: FakeIdGenerator
  let useCase: RegisterAttendanceListUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    memberRepo = new FakeMemberRepo()
    attendanceListRepo = new FakeAttendanceListRepo()
    eventRepo = new FakeEventRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterAttendanceListUseCase(
      uow,
      memberRepo,
      attendanceListRepo,
      eventRepo,
      idGenerator
    )
  })

  it('records an attendance list via UoW, saving the list and related domain event', async () => {
    memberRepo.existingMemberIds.add('member-1')
    memberRepo.existingMemberIds.add('member-2')
    const start = new Date('2026-03-27T17:00:00Z')

    const dto: RegisterAttendanceListCommand = {
      memberIds: ['member-1', 'member-2'],
      start
    }

    await useCase.handle(dto)

    expect(attendanceListRepo.existsByStartChecks).toEqual([start])
    expect(memberRepo.existsByIdChecks).toEqual(['member-1', 'member-2'])
    expect(uow.execute).toHaveBeenCalledTimes(1)

    expect(attendanceListRepo.savedAttendanceLists).toHaveLength(1)
    const savedAttendanceList = attendanceListRepo.savedAttendanceLists[0]
    expect(savedAttendanceList).toMatchObject({
      memberIds: ['member-1', 'member-2'],
      start
    })
    // The fixed ID proves the workflow consumes the injected generator instead of delegating infrastructure concerns into the aggregate.
    expect(savedAttendanceList.id).toBe('attendance-list-generated-by-test')
    expect(idGenerator.generatedIds).toEqual([
      'attendance-list-generated-by-test'
    ])

    expect(eventRepo.savedEvents).toHaveLength(1)
    const savedEvent = eventRepo.savedEvents[0]
    expect(savedEvent.eventName).toBe('attendance-list.recorded')
    // The assertion narrows to the concrete event type so the test documents that the event log stores a snapshot payload, not the mutable aggregate instance itself.
    expect(savedEvent).toBeInstanceOf(AttendanceListRecordedDomainEvent)
    expect((savedEvent as AttendanceListRecordedDomainEvent).payload).toEqual(
      savedAttendanceList.toSnapshot()
    )
  })

  it('allows creating an empty attendance list without member lookups', async () => {
    const start = new Date('2026-03-27T17:00:00Z')

    await useCase.handle({
      memberIds: [],
      start
    })

    expect(attendanceListRepo.existsByStartChecks).toEqual([start])
    expect(memberRepo.existsByIdChecks).toEqual([])
    expect(attendanceListRepo.savedAttendanceLists).toHaveLength(1)
    expect(attendanceListRepo.savedAttendanceLists[0].memberIds).toEqual([])
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('throws when trying to record attendance for an unknown member', async () => {
    const start = new Date('2026-03-27T17:00:00Z')
    memberRepo.existingMemberIds.add('member-1')

    await expect(
      useCase.handle({
        memberIds: ['member-1', 'missing-member'],
        start
      })
    ).rejects.toThrow(MemberNotFoundError)

    expect(attendanceListRepo.existsByStartChecks).toEqual([start])
    expect(memberRepo.existsByIdChecks).toEqual(['member-1', 'missing-member'])
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(attendanceListRepo.savedAttendanceLists).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('throws when the same training start already has an attendance list', async () => {
    const start = new Date('2026-03-27T17:00:00Z')
    attendanceListRepo.existingStarts.add(start.getTime())

    await expect(
      useCase.handle({
        memberIds: [],
        start
      })
    ).rejects.toThrow(AttendanceListAlreadyExistsError)

    expect(attendanceListRepo.existsByStartChecks).toEqual([start])
    expect(memberRepo.existsByIdChecks).toEqual([])
    expect(uow.execute).toHaveBeenCalledTimes(1)
    expect(idGenerator.generatedIds).toHaveLength(0)
    expect(attendanceListRepo.savedAttendanceLists).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('rejects a concurrent second attendance registration for the same start', async () => {
    const start = new Date('2026-03-27T17:00:00Z')
    memberRepo.existingMemberIds.add('member-1')

    const dto: RegisterAttendanceListCommand = {
      memberIds: ['member-1'],
      start
    }

    const results = await Promise.allSettled([
      useCase.handle(dto),
      useCase.handle(dto)
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
    ).toBeInstanceOf(AttendanceListAlreadyExistsError)
    expect(attendanceListRepo.savedAttendanceLists).toHaveLength(1)
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(idGenerator.generatedIds).toEqual([
      'attendance-list-generated-by-test'
    ])
  })
})
