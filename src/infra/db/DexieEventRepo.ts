import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import { ClubCreatedDomainEvent } from '@/domain/model/club'
import type { PersistedDomainEvent, TrainerNotebookDb } from '@/infra/db'

export type PersistedClubSnapshot = {
  id: string
  name: string
  foundingDate: Date
  createdAt: Date
}

export type PersistedClubCreatedPayload = {
  club: PersistedClubSnapshot
}

export type PersistedClubCreatedEvent = PersistedDomainEvent<PersistedClubCreatedPayload> & {
  eventName: 'club.created'
}

export class DexieEventRepo implements EventRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(event: DomainEvent): Promise<void> {
    await this.database.events.add(this.toPersistedEvent(event))
  }

  private toPersistedEvent(
    event: DomainEvent
  ): PersistedDomainEvent<unknown> {
    if (event instanceof ClubCreatedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          club: {
            id: event.club.id,
            name: event.club.name,
            foundingDate: event.club.foundingDate,
            createdAt: event.club.createdAt
          }
        } satisfies PersistedClubCreatedPayload
      } satisfies PersistedClubCreatedEvent
    }

    throw new Error(`Unsupported domain event: ${event.eventName}`)
  }
}
