import { beforeEach, describe, expect, it } from 'vitest'

import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import { UpdateAttendanceListUseCase } from '@/application/UpdateAttendanceListUseCase'
import type { UpdateAttendanceListCommand } from '@/application/requests/UpdateAttendanceListCommand'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import {
  AttendanceList,
  AttendanceListAlreadyExistsError,
  AttendanceListNotFoundError,
  AttendanceListUpdatedDomainEvent
} from '@/domain/model/AttendanceList'
import type { Member } from '@/domain/model/member'
import { MemberNotFoundError } from '@/domain/model/member'
class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeMemberRepo implements MemberRepoPort {
  public readonly existsByIdChecks: string[] = []
  public existingMemberIds = new Set<string>()

  async save(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- This fake keeps the full repo contract while attendance update tests only rely on existsById.
    _member: Member
  ): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async update(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- This fake keeps the full repo contract while attendance update tests only rely on existsById.
    _member: Member
  ): Promise<void> {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Attendance updates do not depend on duplicate member identity checks.
    _firstName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Attendance updates do not depend on duplicate member identity checks.
    _lastName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Attendance updates do not depend on duplicate member identity checks.
    _dateOfBirth: Date
  ): Promise<boolean> {
    return false
  }
}

class FakeAttendanceListRepo implements AttendanceListRepoPort {
  public readonly findByIdChecks: string[] = []
  public readonly updateCalls: AttendanceList[] = []
  public readonly existsByStartChecks: Date[] = []
  public attendanceListsById = new Map<string, AttendanceList>()
  public existingStarts = new Set<number>()

  async findById(attendanceListId: string): Promise<AttendanceList | null> {
    this.findByIdChecks.push(attendanceListId)
    return this.attendanceListsById.get(attendanceListId) ?? null
  }

  async save(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- This fake keeps the full repo contract while attendance update tests only rely on findById/update.
    _attendanceList: AttendanceList
  ): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async update(attendanceList: AttendanceList): Promise<void> {
    this.updateCalls.push(attendanceList)
    this.attendanceListsById.set(attendanceList.id, attendanceList)
  }

  async existsByStart(start: Date): Promise<boolean> {
    this.existsByStartChecks.push(new Date(start.getTime()))

    return (
      this.existingStarts.has(start.getTime()) ||
      [...this.attendanceListsById.values()].some(
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

describe('UpdateAttendanceListUseCase', () => {
  let useCase: UpdateAttendanceListUseCase
  let memberRepo: FakeMemberRepo
  let attendanceListRepo: FakeAttendanceListRepo
  let eventRepo: FakeEventRepo

  beforeEach(() => {
    memberRepo = new FakeMemberRepo()
    attendanceListRepo = new FakeAttendanceListRepo()
    eventRepo = new FakeEventRepo()
    useCase = new UpdateAttendanceListUseCase(
      new FakeUnitOfWork(),
      memberRepo,
      attendanceListRepo,
      eventRepo
    )
  })

  it('updates an attendance list and stores attendance-list.updated', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    attendanceListRepo.attendanceListsById.set(
      existingAttendanceList.id,
      existingAttendanceList
    )
    memberRepo.existingMemberIds.add('member-1')
    memberRepo.existingMemberIds.add('member-2')

    const dto: UpdateAttendanceListCommand = {
      attendanceListId: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T18:00:00Z')
    }

    await useCase.handle(dto)

    expect(attendanceListRepo.findByIdChecks).toEqual(['attendance-list-1'])
    expect(attendanceListRepo.existsByStartChecks).toEqual([dto.start])
    expect(memberRepo.existsByIdChecks).toEqual(['member-1', 'member-2'])
    expect(attendanceListRepo.updateCalls).toHaveLength(1)
    expect(attendanceListRepo.updateCalls[0]?.toSnapshot()).toEqual({
      id: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T18:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(
      AttendanceListUpdatedDomainEvent
    )
  })

  it('does not run duplicate-start checks when the start stays unchanged', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    attendanceListRepo.attendanceListsById.set(
      existingAttendanceList.id,
      existingAttendanceList
    )
    memberRepo.existingMemberIds.add('member-1')

    await useCase.handle({
      attendanceListId: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z')
    })

    expect(attendanceListRepo.existsByStartChecks).toEqual([])
  })

  it('throws when the attendance list does not exist', async () => {
    await expect(
      useCase.handle({
        attendanceListId: 'missing',
        memberIds: [],
        start: new Date('2026-03-27T17:00:00Z')
      })
    ).rejects.toThrow(AttendanceListNotFoundError)

    expect(attendanceListRepo.updateCalls).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('throws when the changed start collides with another attendance list', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    attendanceListRepo.attendanceListsById.set(
      existingAttendanceList.id,
      existingAttendanceList
    )
    attendanceListRepo.existingStarts.add(
      new Date('2026-03-27T18:00:00Z').getTime()
    )

    await expect(
      useCase.handle({
        attendanceListId: 'attendance-list-1',
        memberIds: [],
        start: new Date('2026-03-27T18:00:00Z')
      })
    ).rejects.toThrow(AttendanceListAlreadyExistsError)

    expect(attendanceListRepo.updateCalls).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })

  it('throws when at least one selected member no longer exists', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    attendanceListRepo.attendanceListsById.set(
      existingAttendanceList.id,
      existingAttendanceList
    )
    memberRepo.existingMemberIds.add('member-1')

    await expect(
      useCase.handle({
        attendanceListId: 'attendance-list-1',
        memberIds: ['member-1', 'missing-member'],
        start: new Date('2026-03-27T17:00:00Z')
      })
    ).rejects.toThrow(MemberNotFoundError)

    expect(attendanceListRepo.updateCalls).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})
