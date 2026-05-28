import type { DomainEvent } from '@/write/domain/events/DomainEvent'

export interface EventRepoPort {
  save(event: DomainEvent): Promise<void>
}

export class FakeEventRepo implements EventRepoPort {
  public readonly savedEvents: DomainEvent[] = []

  async save(event: DomainEvent): Promise<void> {
    this.savedEvents.push(event)
  }
}
