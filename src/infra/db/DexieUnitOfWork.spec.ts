import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Club } from '@/domain/model/club'
import type {
  PersistedClub,
  PersistedDomainEvent,
  TrainerNotebookDb
} from '@/infra/db'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'
import type { PersistedClubCreatedPayload } from '@/infra/db/DexieEventRepo'
import { TrainerNotebookDb as DexieDatabase } from '@/infra/db'

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
    const event = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await expect(
      unitOfWork.execute(async () => {
        await database.clubs.add({
          id: event.club.id,
          name: event.club.name,
          foundingDate: event.club.foundingDate,
          createdAt: event.club.createdAt
        } satisfies PersistedClub)
        await database.events.add({
          eventId: event.eventId,
          eventName: event.eventName,
          occurredAt: event.occurredAt,
          payload: {
            club: {
              id: event.club.id,
              name: event.club.name,
              foundingDate: event.club.foundingDate,
              createdAt: event.club.createdAt
            }
          }
        } satisfies PersistedDomainEvent<PersistedClubCreatedPayload>)

        throw new Error('rollback')
      })
    ).rejects.toThrow('rollback')

    await expect(database.clubs.count()).resolves.toBe(0)
    await expect(database.events.count()).resolves.toBe(0)
  })
})
