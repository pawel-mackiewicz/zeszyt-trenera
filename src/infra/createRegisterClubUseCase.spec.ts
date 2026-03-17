import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PersistedDomainEvent } from '@/infra/db'
import {
  createRegisterClubUseCase
} from '@/infra/createRegisterClubUseCase'
import { TrainerNotebookDb } from '@/infra/db'
import type { PersistedClubCreatedPayload } from '@/infra/db/DexieEventRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('createRegisterClubUseCase', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('register-club'))
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('assembles Dexie adapters that persist a club and matching event row', async () => {
    const useCase = createRegisterClubUseCase(database)

    await useCase.handle({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })

    const persistedClubs = await database.clubs.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedClub = persistedClubs[0]
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<PersistedClubCreatedPayload>

    expect(persistedClubs).toHaveLength(1)
    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'club.created',
      payload: {
        club: {
          id: persistedClub.id,
          name: persistedClub.name,
          foundingDate: persistedClub.foundingDate,
          createdAt: persistedClub.createdAt
        }
      }
    })
  })
})
