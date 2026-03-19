import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import { ClubCreatedDomainEvent } from '@/domain/model/club'
import { TrainerCreatedDomainEvent } from '@/domain/model/trainer'
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

export type PersistedClubCreatedEvent =
  PersistedDomainEvent<PersistedClubCreatedPayload> & {
    eventName: 'club.created'
  }

export type PersistedTrainerSnapshot = {
  id: string
  name: string
  createdAt: Date
}

export type PersistedTrainerCreatedPayload = {
  trainer: PersistedTrainerSnapshot
}

export type PersistedTrainerCreatedEvent =
  PersistedDomainEvent<PersistedTrainerCreatedPayload> & {
    eventName: 'trainer.created'
  }

export class DexieEventRepo implements EventRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(event: DomainEvent): Promise<void> {
    await this.database.events.add(this.toPersistedEvent(event))
  }

  private toPersistedEvent(event: DomainEvent): PersistedDomainEvent<unknown> {
    if (event instanceof ClubCreatedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          // The event log reuses the same club snapshot as the main table so replay data matches persisted state.
          club: event.club.toSnapshot()
        } satisfies PersistedClubCreatedPayload
      } satisfies PersistedClubCreatedEvent
    }

    if (event instanceof TrainerCreatedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          // Trainer events reuse the aggregate snapshot so the event log and primary table stay aligned for offline replay and inspection.
          trainer: event.trainer.toSnapshot()
        } satisfies PersistedTrainerCreatedPayload
      } satisfies PersistedTrainerCreatedEvent
    }

    throw new Error(`Unsupported domain event: ${event.eventName}`)
  }
}
