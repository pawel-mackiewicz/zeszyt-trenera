import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DomainEvent } from '@/domain/events/DomainEvent'
import { Club } from '@/domain/model/club'
import {
  DexieEventRepo,
  type PersistedClubCreatedEvent
} from '@/infra/db/DexieEventRepo'
import { TrainerNotebookDb } from '@/infra/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

class UnsupportedDomainEvent extends DomainEvent {
  public readonly eventName = 'unsupported.event'

  public constructor() {
    super()
  }
}

describe('DexieEventRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieEventRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('event-repo'))
    repository = new DexieEventRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists a club.created event into the generic event log', async () => {
    const event = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z')
    )

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent = persistedEvents[0] as PersistedClubCreatedEvent

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'club.created',
      occurredAt: event.occurredAt,
      payload: {
        club: {
          id: event.club.id,
          name: event.club.name,
          foundingDate: event.club.foundingDate,
          createdAt: event.club.createdAt
        }
      }
    })
  })

  it('throws and does not persist anything for an unsupported event', async () => {
    const unsupportedEvent = new UnsupportedDomainEvent()

    await expect(repository.save(unsupportedEvent)).rejects.toThrow(
      'Unsupported domain event: unsupported.event'
    )
    await expect(database.events.count()).resolves.toBe(0)
  })
})
