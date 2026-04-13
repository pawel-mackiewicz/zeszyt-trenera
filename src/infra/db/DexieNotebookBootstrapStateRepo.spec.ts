import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NOTEBOOK_BOOTSTRAP_STATES } from '@/application/ports/NotebookBootstrapStatePort'
import { TrainerNotebookDb } from '@/db'
import { Club } from '@/domain/model/Club'
import { Member } from '@/domain/model/Member'
import { Trainer } from '@/domain/model/Trainer'
import { DexieNotebookBootstrapStateRepo } from '@/infra/db/DexieNotebookBootstrapStateRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieNotebookBootstrapStateRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieNotebookBootstrapStateRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('notebook-bootstrap'))
    repository = new DexieNotebookBootstrapStateRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('reports an empty notebook when no local rows exist', async () => {
    await expect(repository.readBootstrapState()).resolves.toBe(
      NOTEBOOK_BOOTSTRAP_STATES.EMPTY
    )
  })

  it('reports setup-ready when the required setup records exist', async () => {
    const [club] = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )
    const [trainer] = Trainer.register('Jane Doe', 'trainer-1')

    await database.clubs.add(club.toSnapshot())
    await database.trainers.add(trainer.toSnapshot())

    await expect(repository.readBootstrapState()).resolves.toBe(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_READY
    )
  })

  it('reports setup-incomplete when local data exists without the required setup baseline', async () => {
    const [member] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
        joinedAt: new Date('2026-03-01T00:00:00Z')
      },
      'member-1'
    )

    await database.members.add(member.toSnapshot())

    await expect(repository.readBootstrapState()).resolves.toBe(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
    )
  })
})
