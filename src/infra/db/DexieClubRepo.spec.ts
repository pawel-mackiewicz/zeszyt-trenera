import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Club } from '@/domain/model/Club'
import { DexieClubRepo } from '@/infra/db/DexieClubRepo'
import { TrainerNotebookDb } from '@/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieClubRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieClubRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('club-repo'))
    repository = new DexieClubRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists a club into Dexie', async () => {
    const [club] = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await repository.save(club)

    const persistedClubs = await database.clubs.toArray()

    expect(persistedClubs).toHaveLength(1)
    expect(persistedClubs[0]).toMatchObject({
      id: club.id,
      name: club.name,
      foundingDate: club.foundingDate,
      createdAt: club.createdAt
    })
  })

  it('reports when no club exists yet', async () => {
    await expect(repository.exists()).resolves.toBe(false)
  })

  it('reports when a club is already persisted', async () => {
    const [club] = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await repository.save(club)

    await expect(repository.exists()).resolves.toBe(true)
  })
})
