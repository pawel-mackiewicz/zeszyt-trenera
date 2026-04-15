import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { DexieAppResetRepo } from '@/write/infra/db/DexieAppResetRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieAppResetRepo', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('app-reset'))
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('clears every persisted table', async () => {
    const repo = new DexieAppResetRepo(database)

    await database.clubs.add({
      id: 'club-1',
      name: 'Alpha',
      foundingDate: new Date('1999-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z')
    })
    await database.trainers.add({
      id: 'trainer-1',
      name: 'Coach',
      createdAt: new Date('2026-01-01T00:00:00Z')
    })
    await database.members.add({
      id: 'member-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 222 111 333',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z')
    })
    await database.membershipPayments.add({
      id: 'payment-1',
      memberId: 'member-1',
      coveredMonth: '2026-01',
      createdAt: new Date('2026-01-01T00:00:00Z')
    })
    await database.attendanceLists.add({
      id: 'attendance-1',
      memberIds: ['member-1'],
      start: new Date('2026-01-01T18:00:00Z'),
      createdAt: new Date('2026-01-01T18:00:00Z')
    })
    await database.events.add({
      eventId: 'event-1',
      eventName: 'club.created',
      occurredAt: new Date('2026-01-01T00:00:00Z'),
      payload: { id: 'club-1' }
    })

    await repo.clearAllData()

    await expect(database.clubs.count()).resolves.toBe(0)
    await expect(database.trainers.count()).resolves.toBe(0)
    await expect(database.members.count()).resolves.toBe(0)
    await expect(database.membershipPayments.count()).resolves.toBe(0)
    await expect(database.attendanceLists.count()).resolves.toBe(0)
    await expect(database.events.count()).resolves.toBe(0)
  })
})
