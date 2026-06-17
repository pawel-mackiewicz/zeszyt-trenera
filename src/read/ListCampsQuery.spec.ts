import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppServices, type AppServices } from '@/appServices'
import { TrainerNotebookDb } from '@/db'
import { ListCampsQuery } from '@/read/ListCampsQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ListCampsQuery', () => {
  let database: TrainerNotebookDb
  let services: AppServices
  let query: ListCampsQuery

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    database = new TrainerNotebookDb(createTestDbName('camps-read'))
    services = createAppServices(database)
    query = new ListCampsQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
    vi.useRealTimers()
  })

  it('divides camps into present and past lists by finish date', async () => {
    await registerCamp({
      name: 'January camp',
      note: 'Already finished',
      startDate: new Date('2026-01-10T09:00:00Z'),
      finishDate: new Date('2026-01-18T16:00:00Z')
    })
    await registerCamp({
      name: 'February camp',
      note: 'Most recent finished camp',
      startDate: new Date('2026-01-26T09:00:00Z'),
      finishDate: new Date('2026-02-01T16:00:00Z')
    })
    await registerCamp({
      name: 'Ongoing camp',
      note: 'Still open on read date',
      startDate: new Date('2026-02-10T09:00:00Z'),
      finishDate: new Date('2026-02-20T16:00:00Z')
    })
    await registerCamp({
      name: 'Boundary camp',
      note: 'Finishes exactly on read date',
      startDate: new Date('2026-02-14T09:00:00Z'),
      finishDate: new Date('2026-02-15T12:00:00Z')
    })
    await registerCamp({
      name: 'Spring camp',
      note: 'Upcoming',
      startDate: new Date('2026-03-03T09:00:00Z'),
      finishDate: new Date('2026-03-10T16:00:00Z')
    })

    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'))

    await expect(query.handle()).resolves.toEqual({
      present: [
        {
          id: expect.any(String),
          name: 'Boundary camp',
          startDate: new Date('2026-02-14T09:00:00Z'),
          finishDate: new Date('2026-02-15T12:00:00Z')
        },
        {
          id: expect.any(String),
          name: 'Ongoing camp',
          startDate: new Date('2026-02-10T09:00:00Z'),
          finishDate: new Date('2026-02-20T16:00:00Z')
        },
        {
          id: expect.any(String),
          name: 'Spring camp',
          startDate: new Date('2026-03-03T09:00:00Z'),
          finishDate: new Date('2026-03-10T16:00:00Z')
        }
      ],
      past: [
        {
          id: expect.any(String),
          name: 'February camp',
          startDate: new Date('2026-01-26T09:00:00Z'),
          finishDate: new Date('2026-02-01T16:00:00Z')
        },
        {
          id: expect.any(String),
          name: 'January camp',
          startDate: new Date('2026-01-10T09:00:00Z'),
          finishDate: new Date('2026-01-18T16:00:00Z')
        }
      ]
    })
  })

  async function registerCamp({
    name,
    note,
    startDate,
    finishDate
  }: {
    name: string
    note: string
    startDate: Date
    finishDate: Date
  }) {
    await services.useCases.registerCamp.handle({
      name,
      note,
      startDate,
      finishDate,
      price: {
        amountMinor: 120_000,
        currency: 'PLN'
      }
    })
  }
})
