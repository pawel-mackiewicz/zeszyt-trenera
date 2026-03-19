import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { createAppServices } from '@/infra/appServices'
import type { PersistedDomainEvent } from '@/infra/db'
import { TrainerNotebookDb } from '@/infra/db'
import type { PersistedClubCreatedPayload } from '@/infra/db/DexieEventRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('appServices', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('register-club'))
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('reuses the same workflow and database handle inside one services bag', () => {
    const services = createAppServices(database)

    // Reusing one workflow instance keeps writes deterministic while the app resolves the same workflow from different UI entry points.
    expect(services.database).toBe(database)
    expect(services.useCases.registerClub).toBe(services.useCases.registerClub)
  })

  it('assembles Dexie adapters that persist a club and matching event row', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerClub

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

  it('throws a domain error when trying to register a second club', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerClub

    await useCase.handle({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })

    expect(
      useCase.handle({
        clubName: 'Falubaz Zielona Gora',
        foundingDate: new Date('1946-01-01T00:00:00Z')
      })
    ).rejects.toThrow(ClubAlreadyExistsError)

    await expect(database.clubs.toArray()).resolves.toHaveLength(1)
    await expect(database.events.toArray()).resolves.toHaveLength(1)
  })
})
