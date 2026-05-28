import { beforeEach, describe, expect, it } from 'vitest'

import { DeleteAttendanceListUseCase } from '@/write/application/DeleteAttendanceListUseCase'
import type { AttendanceListRepoPort } from '@/write/application/ports/AttendanceListRepoPort'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { DomainEvent } from '@/write/domain/events/DomainEvent'
import {
  AttendanceList,
  AttendanceListDeletedDomainEvent,
  AttendanceListNotFoundError
} from '@/write/domain/model/AttendanceList'

class FakeUnitOfWork implements UnitOfWork {
  async execute<T>(action: () => Promise<T>): Promise<T> {
    return await action()
  }
}

class FakeAttendanceListRepo implements AttendanceListRepoPort {
  public readonly findByIdChecks: string[] = []
  public readonly deleteCalls: string[] = []
  public attendanceListsById = new Map<string, AttendanceList>()

  async findById(attendanceListId: string): Promise<AttendanceList | null> {
    this.findByIdChecks.push(attendanceListId)
    return this.attendanceListsById.get(attendanceListId) ?? null
  }

  async findIdsByMemberId(_memberId: string): Promise<string[]> {
    return []
  }

  async save(_attendanceList: AttendanceList): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async update(_attendanceList: AttendanceList): Promise<void> {
    throw new Error('Not implemented in this fake')
  }

  async delete(attendanceListId: string): Promise<void> {
    this.deleteCalls.push(attendanceListId)
    this.attendanceListsById.delete(attendanceListId)
  }

  async existsByStart(_start: Date): Promise<boolean> {
    return false
  }
}

class FakeEventRepo implements EventRepoPort {
  public readonly savedEvents: DomainEvent[] = []

  async save(event: DomainEvent): Promise<void> {
    this.savedEvents.push(event)
  }
}

describe('DeleteAttendanceListUseCase', () => {
  let useCase: DeleteAttendanceListUseCase
  let attendanceListRepo: FakeAttendanceListRepo
  let eventRepo: FakeEventRepo

  beforeEach(() => {
    attendanceListRepo = new FakeAttendanceListRepo()
    eventRepo = new FakeEventRepo()
    useCase = new DeleteAttendanceListUseCase(
      new FakeUnitOfWork(),
      attendanceListRepo,
      eventRepo
    )
  })

  it('deletes a non-empty attendance list and stores attendance-list.deleted', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    attendanceListRepo.attendanceListsById.set(
      existingAttendanceList.id,
      existingAttendanceList
    )

    await useCase.handle({ attendanceListId: 'attendance-list-1' })

    expect(attendanceListRepo.findByIdChecks).toEqual(['attendance-list-1'])
    expect(attendanceListRepo.deleteCalls).toEqual(['attendance-list-1'])
    expect(
      attendanceListRepo.attendanceListsById.has('attendance-list-1')
    ).toBe(false)
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0]).toBeInstanceOf(
      AttendanceListDeletedDomainEvent
    )
    expect(eventRepo.savedEvents[0]).toMatchObject({
      eventName: 'attendance-list.deleted',
      payload: existingAttendanceList.toSnapshot()
    })
  })

  it('deletes an empty attendance list', async () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-empty',
      memberIds: [],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })
    attendanceListRepo.attendanceListsById.set(
      existingAttendanceList.id,
      existingAttendanceList
    )

    await useCase.handle({ attendanceListId: 'attendance-list-empty' })

    expect(attendanceListRepo.deleteCalls).toEqual(['attendance-list-empty'])
    expect(eventRepo.savedEvents).toHaveLength(1)
  })

  it('throws when the attendance list does not exist', async () => {
    await expect(
      useCase.handle({ attendanceListId: 'missing-attendance-list' })
    ).rejects.toThrow(AttendanceListNotFoundError)

    expect(attendanceListRepo.deleteCalls).toHaveLength(0)
    expect(eventRepo.savedEvents).toHaveLength(0)
  })
})
