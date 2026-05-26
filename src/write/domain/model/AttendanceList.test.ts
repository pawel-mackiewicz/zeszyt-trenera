import { describe, expect, it } from 'vitest'

import {
  AttendanceList,
  AttendanceListDeletedDomainEvent,
  AttendanceListIdMismatchError,
  AttendanceListRecordedDomainEvent,
  AttendanceListUpdatedDomainEvent,
  DuplicateAttendanceListMemberError,
  InvalidAttendanceListMemberIdError,
  InvalidAttendanceListStartError
} from '@/write/domain/model/AttendanceList'

describe('AttendanceList Model', () => {
  it('creates a deletion event with the removed attendance snapshot', () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })

    const event = AttendanceList.delete(existingAttendanceList)

    expect(event).toBeInstanceOf(AttendanceListDeletedDomainEvent)
    expect(event.eventName).toBe('attendance-list.deleted')
    expect(event.payload).toEqual(existingAttendanceList.toSnapshot())
  })

  it('records an attendance list with all required properties', () => {
    const id = 'attendance-list-1'
    const start = new Date('2026-03-27T17:00:00Z')
    const beforeCreation = new Date()

    // Passing the ID explicitly proves the aggregate follows the same boundary as the other models and does not generate identifiers on its own.
    const [attendanceList, event] = AttendanceList.record(
      {
        memberIds: ['member-1', 'member-2'],
        start
      },
      id
    )

    const afterCreation = new Date()

    expect(attendanceList.id).toBe(id)
    expect(attendanceList.memberIds).toEqual(['member-1', 'member-2'])
    expect(attendanceList.start).toEqual(start)

    expect(attendanceList.createdAt).toBeDefined()
    expect(attendanceList.createdAt).toBeInstanceOf(Date)
    expect(attendanceList.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(attendanceList.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )

    expect(attendanceList.toSnapshot()).toEqual({
      id,
      memberIds: ['member-1', 'member-2'],
      start,
      createdAt: attendanceList.createdAt
    })

    expect(event).toBeDefined()
    expect(event.eventId).toBeDefined()
    expect(event).toBeInstanceOf(AttendanceListRecordedDomainEvent)
    // The raw payload is the canonical event contract so future adapters can store the snapshot without wrapper-specific mapping.
    expect(event.payload).toEqual(attendanceList.toSnapshot())
  })

  it('keeps dates and member ids immutable when callers mutate shared references', () => {
    const inputStart = new Date('2026-03-27T17:00:00Z')
    const inputMemberIds = ['member-1', 'member-2']
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: inputMemberIds,
        start: inputStart
      },
      'attendance-list-1'
    )

    // Mutating caller-owned inputs must not leak into the aggregate because UI form state can keep editing the same objects after submit.
    inputStart.setUTCDate(28)
    inputMemberIds.push('member-3')

    expect(attendanceList.start).toEqual(new Date('2026-03-27T17:00:00Z'))
    expect(attendanceList.memberIds).toEqual(['member-1', 'member-2'])

    const exposedStart = attendanceList.start
    const exposedMemberIds = attendanceList.memberIds
    const snapshot = attendanceList.toSnapshot()

    exposedStart.setUTCDate(29)
    exposedMemberIds.push('member-4')
    snapshot.start.setUTCDate(30)
    snapshot.memberIds.push('member-5')

    expect(attendanceList.start).toEqual(new Date('2026-03-27T17:00:00Z'))
    expect(attendanceList.memberIds).toEqual(['member-1', 'member-2'])
    expect(attendanceList.toSnapshot()).toEqual({
      id: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: attendanceList.createdAt
    })
  })

  it('allows recording an attendance list without any members yet', () => {
    const [attendanceList] = AttendanceList.record(
      {
        memberIds: [],
        start: new Date('2026-03-27T17:00:00Z')
      },
      'attendance-list-1'
    )

    expect(attendanceList.memberIds).toEqual([])
  })

  it('rehydrates and updates an attendance list while preserving id and createdAt', () => {
    const createdAt = new Date('2026-03-01T10:00:00Z')
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt
    })

    const [updatedAttendanceList, event] = AttendanceList.update(
      existingAttendanceList,
      {
        attendanceListId: 'attendance-list-1',
        memberIds: ['member-1', 'member-2'],
        start: new Date('2026-03-27T18:00:00Z')
      }
    )

    expect(updatedAttendanceList.toSnapshot()).toEqual({
      id: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date('2026-03-27T18:00:00Z'),
      createdAt
    })
    expect(event).toBeInstanceOf(AttendanceListUpdatedDomainEvent)
    expect(event.payload).toEqual(updatedAttendanceList.toSnapshot())
  })

  it('rejects attendance updates when the provided id does not match the loaded aggregate', () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })

    expect(() =>
      AttendanceList.update(existingAttendanceList, {
        attendanceListId: 'attendance-list-2',
        memberIds: ['member-1'],
        start: new Date('2026-03-27T17:00:00Z')
      })
    ).toThrow(AttendanceListIdMismatchError)
  })

  it('rejects duplicate member ids', () => {
    expect(() =>
      AttendanceList.record(
        {
          memberIds: ['member-1', 'member-1'],
          start: new Date('2026-03-27T17:00:00Z')
        },
        'attendance-list-1'
      )
    ).toThrow(DuplicateAttendanceListMemberError)
  })

  it('rejects blank member ids', () => {
    expect(() =>
      AttendanceList.record(
        {
          memberIds: ['member-1', '   '],
          start: new Date('2026-03-27T17:00:00Z')
        },
        'attendance-list-1'
      )
    ).toThrow(InvalidAttendanceListMemberIdError)
  })

  it('rejects a start more than one day in the future', () => {
    expect(() =>
      AttendanceList.record(
        {
          memberIds: [],
          start: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60_000)
        },
        'attendance-list-1'
      )
    ).toThrow(InvalidAttendanceListStartError)
  })

  it('applies the same member and start validation rules during updates', () => {
    const existingAttendanceList = AttendanceList.rehydrate({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date('2026-03-27T17:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z')
    })

    expect(() =>
      AttendanceList.update(existingAttendanceList, {
        attendanceListId: 'attendance-list-1',
        memberIds: ['member-1', 'member-1'],
        start: new Date('2026-03-27T17:00:00Z')
      })
    ).toThrow(DuplicateAttendanceListMemberError)

    expect(() =>
      AttendanceList.update(existingAttendanceList, {
        attendanceListId: 'attendance-list-1',
        memberIds: ['member-1'],
        start: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60_000)
      })
    ).toThrow(InvalidAttendanceListStartError)
  })
})
