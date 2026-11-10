import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RegisterAttendanceListUseCase } from './RegisterAttendanceListUseCase'
import type { RegisterAttendanceListCommand } from '@/write/attendance/application/requests/RegisterAttendanceListCommand'
import { FakeAttendanceListRepo } from '@/write/attendance/application/ports/AttendanceListRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import { AttendanceListAlreadyExistsError } from '@/write/attendance/domain/AttendanceList'
import { MemberNotFoundError } from '@/write/members/domain/Member'

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
  let idGenerator: FakeIdGenerator
  let useCase: RegisterAttendanceListUseCase

  beforeEach(() => {
    uow = new FakeUnitOfWork()
    memberRepo = new FakeMemberRepo()
    attendanceListRepo = new FakeAttendanceListRepo()
    idGenerator = new FakeIdGenerator()

    vi.spyOn(uow, 'execute')

    useCase = new RegisterAttendanceListUseCase(
      uow,
      memberRepo,
      attendanceListRepo,
      idGenerator
    )
  })

  it('records an attendance list via UoW, saving the list', async () => {
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
    expect(idGenerator.generatedIds).toEqual([
      'attendance-list-generated-by-test'
    ])
  })
})
