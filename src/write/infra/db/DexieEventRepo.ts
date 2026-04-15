import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { DomainEvent } from '@/write/domain/events/DomainEvent'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedDomainEvent } from '@/write/infra'

export class DexieEventRepo implements EventRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(event: DomainEvent): Promise<void> {
    await this.database.events.add(this.toPersistedEvent(event))
  }

  private toPersistedEvent(event: DomainEvent): PersistedDomainEvent<unknown> {
    // The repo stores the domain event envelope verbatim so new snapshot events do not require new Dexie branches.
    return {
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: event.payload
    }
  }
}
