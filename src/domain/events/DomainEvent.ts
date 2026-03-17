import { v7 as uuidv7 } from 'uuid'

export abstract class DomainEvent {
  public readonly eventId: string
  public readonly occurredAt: Date
  public abstract readonly eventName: string

  protected constructor() {
    this.eventId = uuidv7()
    this.occurredAt = new Date()
  }
}
