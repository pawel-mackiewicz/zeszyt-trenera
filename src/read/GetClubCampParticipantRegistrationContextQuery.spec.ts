import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppServices, type AppServices } from '@/appServices'
import { TrainerNotebookDb } from '@/db'
import { GetClubCampParticipantRegistrationContextQuery } from '@/read/GetClubCampParticipantRegistrationContextQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('GetClubCampParticipantRegistrationContextQuery', () => {
  let database: TrainerNotebookDb
  let services: AppServices
  let query: GetClubCampParticipantRegistrationContextQuery

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    database = new TrainerNotebookDb(
      createTestDbName('club-camp-registration-context-read')
    )
    services = createAppServices(database)
    query = new GetClubCampParticipantRegistrationContextQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
    vi.useRealTimers()
  })

  it('loads the selected club member with the camp price used for registration', async () => {
    await registerCamp('Winter camp', 120_000)
    await registerMember('Amanda', 'Nunes', new Date('1991-05-30T00:00:00Z'))
    const camp = await findCampByName('Winter camp')
    const member = await findMemberByName('Amanda')

    await expect(
      query.handle({
        campId: camp.id,
        memberId: member.id
      })
    ).resolves.toEqual({
      camp: {
        id: camp.id,
        name: 'Winter camp',
        price: {
          amountMinor: 120_000,
          currency: 'PLN'
        }
      },
      member: {
        id: member.id,
        firstName: expect.stringMatching(/^amanda$/i),
        lastName: expect.stringMatching(/^nunes$/i)
      }
    })
  })

  it('loads the same selected club member context when the member is already on the camp roster', async () => {
    await registerCamp('Summer camp', 90_000)
    await registerMember('Royce', 'Gracie', new Date('1966-12-12T00:00:00Z'))
    const camp = await findCampByName('Summer camp')
    const member = await findMemberByName('Royce')

    await services.useCases.registerCampParticipant.handle({
      campId: camp.id,
      person: {
        type: 'club',
        memberId: member.id
      },
      totalAmountDue: camp.price
    })

    await expect(
      query.handle({
        campId: camp.id,
        memberId: member.id
      })
    ).resolves.toEqual(
      expect.objectContaining({
        member: expect.objectContaining({
          id: member.id,
          firstName: expect.stringMatching(/^royce$/i),
          lastName: expect.stringMatching(/^gracie$/i)
        })
      })
    )
  })

  it('does not return registration context for an archived member', async () => {
    await registerCamp('Autumn camp', 75_000)
    await registerMember('Archived', 'Member', new Date('2012-01-01T00:00:00Z'))
    const camp = await findCampByName('Autumn camp')
    const member = await findMemberByName('Archived')

    await services.useCases.archiveMember.handle({
      memberId: member.id
    })

    await expect(
      query.handle({
        campId: camp.id,
        memberId: member.id
      })
    ).resolves.toBeNull()
  })

  async function registerCamp(name: string, amountMinor: number) {
    await services.useCases.registerCamp.handle({
      name,
      note: '',
      startDate: new Date('2026-07-01T09:00:00Z'),
      finishDate: new Date('2026-07-07T16:00:00Z'),
      price: {
        amountMinor,
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

  async function findMemberByName(firstName: string) {
    const member = (await database.members.toArray()).find(
      (persistedMember) =>
        persistedMember.firstName.toLowerCase() === firstName.toLowerCase()
    )

    if (!member) {
      throw new Error(`Member not found in test setup: ${firstName}`)
    }

    return member
  }
})
