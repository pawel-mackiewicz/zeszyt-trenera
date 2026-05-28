import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { DexieAttendanceListRepo } from '@/write/infra/db/DexieAttendanceListRepo'
import { DexieMemberRepo } from '@/write/infra/db/DexieMemberRepo'
import { DexieMembershipPaymentRepo } from '@/write/infra/db/DexieMembershipPaymentRepo'
import type {
  PersistedAttendanceList,
  PersistedMember,
  PersistedMembershipPayment
} from '@/write/infra'

describe('member deletion Dexie repositories', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(
      `member-deletion-repo-${Date.now()}-${Math.random()}`
    )
  })

  afterEach(async () => {
    await database.delete()
  })

  it('deletes a member row by id', async () => {
    const repository = new DexieMemberRepo(database)
    await database.members.add({
      id: 'member-1',
      firstName: 'jan',
      lastName: 'kowalski',
      dateOfBirth: new Date('2000-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    } satisfies PersistedMember)

    await repository.delete('member-1')

    expect(await database.members.get('member-1')).toBeUndefined()
  })

  it('finds membership payment ids by member id with the memberId index', async () => {
    const repository = new DexieMembershipPaymentRepo(database)
    await database.membershipPayments.bulkAdd([
      {
        id: 'payment-2',
        memberId: 'member-1',
        coveredMonth: '2026-02'
      } as unknown as PersistedMembershipPayment,
      {
        id: 'payment-1',
        memberId: 'member-1',
        coveredMonth: '2026-01'
      } as unknown as PersistedMembershipPayment,
      {
        id: 'payment-other',
        memberId: 'member-2',
        coveredMonth: '2026-01'
      } as unknown as PersistedMembershipPayment
    ])

    await expect(repository.findIdsByMemberId('member-1')).resolves.toEqual([
      'payment-1',
      'payment-2'
    ])
  })

  it('finds attendance list ids by member id with the memberIds multi-entry index', async () => {
    const repository = new DexieAttendanceListRepo(database)
    await database.attendanceLists.bulkAdd([
      {
        id: 'attendance-list-2',
        memberIds: ['member-2', 'member-1'],
        start: new Date('2026-02-01T10:00:00.000Z'),
        createdAt: new Date('2026-02-01T10:00:00.000Z')
      } satisfies PersistedAttendanceList,
      {
        id: 'attendance-list-1',
        memberIds: ['member-1'],
        start: new Date('2026-01-01T10:00:00.000Z'),
        createdAt: new Date('2026-01-01T10:00:00.000Z')
      } satisfies PersistedAttendanceList,
      {
        id: 'attendance-list-other',
        memberIds: ['member-2'],
        start: new Date('2026-03-01T10:00:00.000Z'),
        createdAt: new Date('2026-03-01T10:00:00.000Z')
      } satisfies PersistedAttendanceList
    ])

    await expect(repository.findIdsByMemberId('member-1')).resolves.toEqual([
      'attendance-list-1',
      'attendance-list-2'
    ])
  })
})
