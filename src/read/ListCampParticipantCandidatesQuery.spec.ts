import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppServices, type AppServices } from '@/appServices'
import { TrainerNotebookDb } from '@/db'
import { ListCampParticipantCandidatesQuery } from '@/read/ListCampParticipantCandidatesQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ListCampParticipantCandidatesQuery', () => {
  let database: TrainerNotebookDb
  let services: AppServices
  let query: ListCampParticipantCandidatesQuery

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    database = new TrainerNotebookDb(createTestDbName('camp-candidates-read'))
    services = createAppServices(database)
    query = new ListCampParticipantCandidatesQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
    vi.useRealTimers()
  })

  it('marks club members already signed to the camp while keeping the read order neutral', async () => {
    await registerCamp('Winter camp')
    await registerMember('Amanda', 'Nunes', new Date('1991-05-30T00:00:00Z'))
    await registerMember('Royce', 'Gracie', new Date('1966-12-12T00:00:00Z'))
    const camp = await findCampByName('Winter camp')
    const members = await database.members.toArray()
    const signedMember = members.find(
      (member) => member.firstName.toLowerCase() === 'royce'
    )!

    await services.useCases.registerCampParticipant.handle({
      campId: camp.id,
      person: {
        type: 'club',
        memberId: signedMember.id
      },
      totalAmountDue: {
        amountMinor: 0,
        currency: 'PLN'
      }
    })

    await expect(query.handle({ campId: camp.id })).resolves.toEqual([
      expect.objectContaining({
        firstName: expect.stringMatching(/^amanda$/i),
        lastName: expect.stringMatching(/^nunes$/i),
        alreadySigned: false
      }),
      expect.objectContaining({
        firstName: expect.stringMatching(/^royce$/i),
        lastName: expect.stringMatching(/^gracie$/i),
        alreadySigned: true
      })
    ])
  })

  it('excludes archived members from the camp candidate list', async () => {
    await registerCamp('Summer camp')
    await registerMember('Active', 'Member', new Date('2012-01-01T00:00:00Z'))
    await registerMember('Archived', 'Member', new Date('2013-01-01T00:00:00Z'))
    const camp = await findCampByName('Summer camp')
    const members = await database.members.toArray()
    const archivedMember = members.find(
      (member) => member.firstName.toLowerCase() === 'archived'
    )!

    await services.useCases.archiveMember.handle({
      memberId: archivedMember.id
    })

    const candidates = await query.handle({ campId: camp.id })

    expect(candidates.map((member) => member.firstName.toLowerCase())).toEqual([
      'active'
    ])
  })

  async function registerCamp(name: string) {
    await services.useCases.registerCamp.handle({
      name,
      note: '',
      startDate: new Date('2026-07-01T09:00:00Z'),
      finishDate: new Date('2026-07-07T16:00:00Z'),
      price: {
        amountMinor: 120_000,
        currency: 'PLN'
      }
    })
  }

  async function registerMember(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ) {
    await services.useCases.registerMember.handle({
      firstName,
      lastName,
      phoneNumber: null,
      dateOfBirth,
      joinedAt: new Date('2026-01-01T00:00:00Z')
    })
  }

  async function findCampByName(name: string) {
    const camp = (await database.camps.toArray()).find(
      (persistedCamp) => persistedCamp.name === name
    )

    if (!camp) {
      throw new Error(`Camp not found in test setup: ${name}`)
    }

    return camp
  }
})
