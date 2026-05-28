import { beforeEach, describe, expect, it } from 'vitest'

import { FakeAttendanceListRepo } from '@/write/application/ports/AttendanceListRepoPort'
import { FakeEventRepo } from '@/write/application/ports/EventRepoPort'
import { FakeMemberRepo } from '@/write/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import { UpdateAttendanceListUseCase } from '@/write/application/UpdateAttendanceListUseCase'
import type { UpdateAttendanceListCommand } from '@/write/application/requests/UpdateAttendanceListCommand'
import {
  AttendanceList,
  AttendanceListAlreadyExistsError,
  AttendanceListNotFoundError,
  AttendanceListUpdatedDomainEvent
} from '@/write/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/write/domain/model/Member'
class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
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
