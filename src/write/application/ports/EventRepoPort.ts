import type { DomainEvent } from '@/write/domain/events/DomainEvent'

export interface EventRepoPort {
  save(event: DomainEvent): Promise<void>
}
