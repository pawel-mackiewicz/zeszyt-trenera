import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Trainer } from '@/domain/model/trainer'
import { TrainerNotebookDb } from '@/infra/db'
import { DexieTrainerRepo } from '@/infra/db/DexieTrainerRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieTrainerRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieTrainerRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('trainer-repo'))
    repository = new DexieTrainerRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists a trainer into Dexie', async () => {
    const event = Trainer.register('Jane Doe', 'trainer-1')

    await repository.save(event.trainer)

    const persistedTrainers = await database.trainers.toArray()

    expect(persistedTrainers).toHaveLength(1)
    expect(persistedTrainers[0]).toMatchObject({
      id: event.trainer.id,
      name: event.trainer.name,
      createdAt: event.trainer.createdAt
    })
  })

  it('reports when no trainer exists yet', async () => {
    await expect(repository.exists()).resolves.toBe(false)
  })

  it('reports when a trainer is already persisted', async () => {
    const event = Trainer.register('Jane Doe', 'trainer-1')

    await repository.save(event.trainer)

    await expect(repository.exists()).resolves.toBe(true)
  })
})
