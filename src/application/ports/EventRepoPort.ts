import type { DomainEvent } from '@/domain/events/DomainEvent'

export interface EventRepoPort {
  save(event: DomainEvent): void
}
