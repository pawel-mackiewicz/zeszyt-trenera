import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { DexiePaymentReminderSender } from '@/write/memberships/infra/DexiePaymentReminderSender'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexiePaymentReminderSender', () => {
  let database: TrainerNotebookDb
  let sender: DexiePaymentReminderSender

  beforeEach(() => {
    database = new TrainerNotebookDb(
      createTestDbName('payment-reminder-sender')
    )
    sender = new DexiePaymentReminderSender(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('returns sender identity when setup rows exist', async () => {
    await database.clubs.add({
      id: 'club-1',
      name: 'Tiger Club',
      foundingDate: new Date('2001-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z')
    })
    await database.trainers.add({
      id: 'trainer-1',
      name: 'Jane Doe',
      createdAt: new Date('2026-01-01T00:00:00Z')
    })

    await expect(sender.load()).resolves.toEqual({
      clubName: 'Tiger Club',
      trainerName: 'Jane Doe'
    })
  })

  it('returns null when setup rows are incomplete', async () => {
    await database.clubs.add({
      id: 'club-1',
      name: 'Tiger Club',
      foundingDate: new Date('2001-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z')
    })

    await expect(sender.load()).resolves.toBeNull()
  })
})
