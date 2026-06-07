import { v7 as uuidv7 } from 'uuid'

export abstract class DomainEvent<TPayload = unknown> {
  public readonly eventId: string
  public readonly occurredAt: Date
  public readonly payload: TPayload
  public abstract readonly eventName: string

  protected constructor(payload: TPayload) {
    // Domain events own their serialized payload so infrastructure can persist any new event without adding event-specific mapping code.
    this.payload = payload
    this.eventId = uuidv7()
    this.occurredAt = new Date()
  }
}
