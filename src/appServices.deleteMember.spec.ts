import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createAppServices } from '@/appServices'
import { TrainerNotebookDb } from '@/db'
import type { PersistedMember, PersistedMembershipPayment } from '@/write/infra'

describe('deleteMember app service', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(`app-services-delete-member-${Date.now()}`)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('is wired and persists a delete event only when the member is clean', async () => {
    const services = createAppServices(database)
    await database.members.bulkAdd([
      createPersistedMember('blocked-member'),
      createPersistedMember('clean-member')
    ])
    await database.membershipPayments.add({
      id: 'payment-1',
      memberId: 'blocked-member',
      coveredMonth: '2026-01'
    } as unknown as PersistedMembershipPayment)

    await expect(
      services.useCases.deleteMember.handle({ memberId: 'blocked-member' })
    ).resolves.toEqual({
      membershipPaymentIds: ['payment-1'],
      attendanceListIds: [],
      deleted: false
    })
    expect(await database.members.get('blocked-member')).toBeDefined()
    expect(
      await database.events.where('eventName').equals('member.deleted').count()
    ).toBe(0)

    await expect(
      services.useCases.deleteMember.handle({ memberId: 'clean-member' })
    ).resolves.toEqual({
      membershipPaymentIds: [],
      attendanceListIds: [],
      deleted: true
    })

    expect(await database.members.get('clean-member')).toBeUndefined()
    const deleteEvents = await database.events
      .where('eventName')
      .equals('member.deleted')
      .toArray()
    expect(deleteEvents).toHaveLength(1)
    expect(deleteEvents[0].payload).toMatchObject({ id: 'clean-member' })
  })
})

function createPersistedMember(memberId: string): PersistedMember {
  return {
    id: memberId,
    firstName: 'jan',
    lastName: 'kowalski',
    dateOfBirth: new Date('2000-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z')
  }
}
