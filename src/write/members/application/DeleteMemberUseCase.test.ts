import { describe, expect, it } from 'vitest'

import { DeleteMemberUseCase } from '@/write/members/application/DeleteMemberUseCase'
import { FakeAttendanceListRepo } from '@/write/attendance/application/ports/AttendanceListRepoPort'
import {
  FakeEventRepo,
  type EventRepoPort
} from '@/write/shared/events/EventRepoPort'
import { FakeMemberRepo } from '@/write/members/application/MemberRepoPort'
import { FakeMembershipPaymentRepo } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import {
  Member,
  MemberDeletedDomainEvent,
  MemberNotFoundError
} from '@/write/members/domain/Member'

class FakeUnitOfWork implements UnitOfWork {
  public async execute<T>(work: () => Promise<T>): Promise<T> {
    return work()
  }
}

const createMember = (memberId = 'member-1'): Member => {
  const [member] = Member.register(
    {
      firstName: 'Jan',
      lastName: 'Kowalski',
      dateOfBirth: new Date('2000-01-01T00:00:00.000Z')
    },
    memberId
  )

  return member
}

const createUseCase = () => {
  const memberRepo = new FakeMemberRepo()
  const membershipPaymentRepo = new FakeMembershipPaymentRepo()
  const attendanceListRepo = new FakeAttendanceListRepo()
  const eventRepo = new FakeEventRepo()
  const useCase = new DeleteMemberUseCase(
    new FakeUnitOfWork(),
    memberRepo,
    membershipPaymentRepo,
    attendanceListRepo,
    eventRepo as EventRepoPort
  )

  return {
    useCase,
    memberRepo,
    membershipPaymentRepo,
    attendanceListRepo,
    eventRepo
  }
}

describe('DeleteMemberUseCase', () => {
  it('deletes a clean member and returns deleted true', async () => {
    const { useCase, memberRepo, eventRepo } = createUseCase()
    const member = createMember()
    memberRepo.seed(member)

    const result = await useCase.handle({ memberId: member.id })

    expect(result).toEqual({
      membershipPaymentIds: [],
      attendanceListIds: [],
      deleted: true
    })
    expect(await memberRepo.findById(member.id)).toBeNull()
    expect(memberRepo.deletedMemberIds).toEqual([member.id])
    expect(eventRepo.savedEvents).toHaveLength(1)
    expect(eventRepo.savedEvents[0].eventName).toBe('member.deleted')
    expect(
      (eventRepo.savedEvents[0] as MemberDeletedDomainEvent).payload
    ).toEqual(member.toSnapshot())
  })

  it('returns payment ids and leaves a member untouched when payments reference it', async () => {
    const { useCase, memberRepo, membershipPaymentRepo, eventRepo } =
      createUseCase()
    const member = createMember()
    memberRepo.seed(member)
    membershipPaymentRepo.idsByMemberId.set(member.id, [
      'payment-2',
      'payment-1'
    ])

    const result = await useCase.handle({ memberId: member.id })

    expect(result).toEqual({
      membershipPaymentIds: ['payment-1', 'payment-2'],
      attendanceListIds: [],
      deleted: false
    })
    expect(await memberRepo.findById(member.id)).toBe(member)
    expect(memberRepo.deletedMemberIds).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('returns attendance list ids and leaves a member untouched when attendance lists reference it', async () => {
    const { useCase, memberRepo, attendanceListRepo, eventRepo } =
      createUseCase()
    const member = createMember()
    memberRepo.seed(member)
    attendanceListRepo.idsByMemberId.set(member.id, [
      'attendance-list-2',
      'attendance-list-1'
    ])

    const result = await useCase.handle({ memberId: member.id })

    expect(result).toEqual({
      membershipPaymentIds: [],
      attendanceListIds: ['attendance-list-1', 'attendance-list-2'],
      deleted: false
    })
    expect(await memberRepo.findById(member.id)).toBe(member)
    expect(memberRepo.deletedMemberIds).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('returns both dependency id lists when payments and attendance lists reference the member', async () => {
    const {
      useCase,
      memberRepo,
      membershipPaymentRepo,
      attendanceListRepo,
      eventRepo
    } = createUseCase()
    const member = createMember()
    memberRepo.seed(member)
    membershipPaymentRepo.idsByMemberId.set(member.id, [
      'payment-2',
      'payment-1'
    ])
    attendanceListRepo.idsByMemberId.set(member.id, [
      'attendance-list-2',
      'attendance-list-1'
    ])

    const result = await useCase.handle({ memberId: member.id })

    expect(result).toEqual({
      membershipPaymentIds: ['payment-1', 'payment-2'],
      attendanceListIds: ['attendance-list-1', 'attendance-list-2'],
      deleted: false
    })
    expect(await memberRepo.findById(member.id)).toBe(member)
    expect(memberRepo.deletedMemberIds).toEqual([])
    expect(eventRepo.savedEvents).toEqual([])
  })

  it('throws MemberNotFoundError when the member does not exist', async () => {
    const { useCase, eventRepo } = createUseCase()

    await expect(
      useCase.handle({ memberId: 'missing-member' })
    ).rejects.toThrow(MemberNotFoundError)
    expect(eventRepo.savedEvents).toEqual([])
  })
})
