import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NOTEBOOK_BOOTSTRAP_STATES } from '@/system_management/demo/application/ports/NotebookBootstrapStatePort'
import { TrainerNotebookDb } from '@/db'
import { Club } from '@/write/business_profile/domain/Club'
import { Member } from '@/write/members/domain/Member'
import { Trainer } from '@/write/business_profile/domain/Trainer'
import { Camp } from '@/write/camps/domain/Camp'
import { Money } from '@/write/shared/vo/Money'
import { DexieNotebookBootstrapStateRepo } from '@/system_management/demo/infra/db/DexieNotebookBootstrapStateRepo'

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
    const club = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )
    const trainer = Trainer.register('Jane Doe', 'trainer-1')

    await database.clubs.add(club.toSnapshot())
    await database.trainers.add(trainer.toSnapshot())

    await expect(repository.readBootstrapState()).resolves.toBe(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_READY
    )
  })

  it('reports setup-incomplete when local data exists without the required setup baseline', async () => {
    const member = Member.register(
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

  it('protects an existing camp when club and trainer setup is missing', async () => {
    const camp = Camp.register(
      {
        name: 'Summer camp',
        startDate: new Date('2026-07-01T00:00:00Z'),
        finishDate: new Date('2026-07-08T00:00:00Z'),
        price: Money.create({ amountMinor: 1200_00, currency: 'PLN' })
      },
      'camp-1'
    )
    await database.camps.add(camp.toSnapshot())

    await expect(repository.readBootstrapState()).resolves.toBe(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
    )
  })

  it('protects an existing camp participant when club and trainer setup is missing', async () => {
    await database.campParticipants.add({
      id: 'participant-1',
      campId: 'camp-1',
      personKey: 'club:member-1',
      person: { type: 'club', memberId: 'member-1' },
      status: 'REGISTERED',
      totalAmountDue: { amountMinor: 1200_00, currency: 'PLN' },
      discounts: [],
      financialTransactions: [],
      addedAt: new Date(),
      updatedAt: new Date()
    })

    await expect(repository.readBootstrapState()).resolves.toBe(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
    )
  })
})
