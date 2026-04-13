import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Trainer } from '@/domain/model/Trainer'
import { TrainerNotebookDb } from '@/db'
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
    const [trainer] = Trainer.register('Jane Doe', 'trainer-1')

    await repository.save(trainer)

    const persistedTrainers = await database.trainers.toArray()

    expect(persistedTrainers).toHaveLength(1)
    expect(persistedTrainers[0]).toMatchObject({
      id: trainer.id,
      name: trainer.name,
      createdAt: trainer.createdAt
    })
  })

  it('reports when no trainer exists yet', async () => {
    await expect(repository.exists()).resolves.toBe(false)
  })

  it('reports when a trainer is already persisted', async () => {
    const [trainer] = Trainer.register('Jane Doe', 'trainer-1')

    await repository.save(trainer)

    await expect(repository.exists()).resolves.toBe(true)
  })
})
