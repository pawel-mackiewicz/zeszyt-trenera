import { afterEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import { DexieCampParticipantRepo } from '@/write/camps/infra/db/DexieCampParticipantRepo'
import { CampParticipant } from '@/write/camps/domain/CampParticipant'
import { Money } from '@/write/shared/vo/Money'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('DexieCampParticipantRepo', () => {
  let database: TrainerNotebookDb | undefined

  afterEach(async () => {
    if (database) {
      database.close()
      await database.delete()
    }
  })

  it('saves a participant and finds it by camp and normalized person identity', async () => {
    database = new TrainerNotebookDb(createTestDbName('camp-participants'))
    const repo = new DexieCampParticipantRepo(database)
    const [participant] = CampParticipant.register(
      {
        campId: ' camp-1 ',
        person: {
          type: 'external',
          firstName: ' jane ',
          lastName: ' doe '
        },
        totalAmountDue: Money.create({
          amountMinor: 100000,
          currency: 'PLN'
        })
      },
      'participant-1'
    )

    expect(
      await repo.existsByCampIdAndPerson('camp-1', participant.person)
    ).toBe(false)

    await repo.save(participant)

    expect(
      await repo.existsByCampIdAndPerson('camp-1', participant.person)
    ).toBe(true)
    const persistedRows = await database.campParticipants.toArray()
    expect(persistedRows).toHaveLength(1)
    expect(persistedRows[0]).toMatchObject({
      id: 'participant-1',
      campId: 'camp-1',
      person: {
        type: 'external',
        firstName: 'jane',
        lastName: 'doe'
      },
      status: 'REGISTERED',
      totalAmountDue: {
        amountMinor: 100000,
        currency: 'PLN'
      }
    })
  })
})
