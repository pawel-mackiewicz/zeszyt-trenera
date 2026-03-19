import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { createAppServices } from '@/infra/appServices'
import type { PersistedDomainEvent } from '@/infra/db'
import { TrainerNotebookDb } from '@/infra/db'
import type {
  PersistedClubCreatedPayload,
  PersistedTrainerCreatedPayload
} from '@/infra/db/DexieEventRepo'

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
    expect(services.useCases.registerTrainer).toBe(
      services.useCases.registerTrainer
    )
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

  it('assembles Dexie adapters that persist a trainer and matching event row', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerTrainer

    await useCase.handle({
      trainerName: 'Jane Doe'
    })

    const persistedTrainers = await database.trainers.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedTrainer = persistedTrainers[0]
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<PersistedTrainerCreatedPayload>

    expect(persistedTrainers).toHaveLength(1)
    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'trainer.created',
      payload: {
        trainer: {
          id: persistedTrainer.id,
          name: persistedTrainer.name,
          createdAt: persistedTrainer.createdAt
        }
      }
    })
  })

  it('throws a domain error when trying to register a second trainer', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerTrainer

    await useCase.handle({
      trainerName: 'Jane Doe'
    })

    expect(
      useCase.handle({
        trainerName: 'John Smith'
      })
    ).rejects.toThrow(TrainerAlreadyExistsError)

    await expect(database.trainers.toArray()).resolves.toHaveLength(1)
    await expect(database.events.toArray()).resolves.toHaveLength(1)
  })
})
