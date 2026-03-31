import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Club, type ClubSnapshot } from '@/domain/model/club'
import type {
  PersistedClub,
  PersistedDomainEvent,
  TrainerNotebookDb
} from '@/db'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'
import { TrainerNotebookDb as DexieDatabase } from '@/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieUnitOfWork', () => {
  let database: TrainerNotebookDb
  let unitOfWork: DexieUnitOfWork

  beforeEach(() => {
    database = new DexieDatabase(createTestDbName('unit-of-work'))
    unitOfWork = new DexieUnitOfWork(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('rolls back writes across all tables when the transaction fails', async () => {
    const [club, event] = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await expect(
      unitOfWork.execute(async () => {
        await database.clubs.add({
          id: club.id,
          name: club.name,
          foundingDate: club.foundingDate,
          createdAt: club.createdAt
        } satisfies PersistedClub)
        await database.events.add({
          eventId: event.eventId,
          eventName: event.eventName,
          occurredAt: event.occurredAt,
          // The event row should mirror the same raw snapshot contract that replay code restores directly.
          payload: event.payload
        } satisfies PersistedDomainEvent<ClubSnapshot>)

        throw new Error('rollback')
      })
    ).rejects.toThrow('rollback')

    await expect(database.clubs.count()).resolves.toBe(0)
    await expect(database.events.count()).resolves.toBe(0)
  })
})
