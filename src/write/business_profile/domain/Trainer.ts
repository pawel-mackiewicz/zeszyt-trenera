import { DomainEvent } from '@/write/shared/events/DomainEvent'
import { copyDate } from '../../shared/DateUtils'

export type TrainerSnapshot = {
  id: string
  name: string
  createdAt: Date
}

export class Trainer {
  public readonly id: string
  private _createdAt: Date

  private _name: string

  private constructor(name: string, id: string, createdAt: Date = new Date()) {
    this.id = id
    this._createdAt = copyDate(createdAt)
    this._name = name
  }

  public static register(
    name: string,
    id: string
  ): [Trainer, TrainerCreatedDomainEvent] {
    // Registration receives the ID from outside so the aggregate stays independent from infrastructure ID generators.
    const trainer = new Trainer(name, id)
    // Event payloads store snapshots so the offline log keeps an immutable copy even if the in-memory aggregate changes later.
    const event = new TrainerCreatedDomainEvent(trainer.toSnapshot())
    return [trainer, event]
  }

  public static restore(snapshot: TrainerSnapshot): Trainer {
    return new Trainer(snapshot.name, snapshot.id, snapshot.createdAt)
  }

  // Persistence adapters and event serializers share one snapshot so stored trainer data cannot drift apart.
  public toSnapshot(): TrainerSnapshot {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt
    }
  }

  public get name() {
    return this._name
  }

  public get createdAt() {
    return copyDate(this._createdAt)
  }
}

export class TrainerCreatedDomainEvent extends DomainEvent<TrainerSnapshot> {
  public readonly eventName = 'trainer.created'

  public constructor(trainer: TrainerSnapshot) {
    // The payload is the canonical replay contract so persistence adapters can store new event types without per-event translation logic.
    super(trainer)
  }
}

export class TrainerAlreadyExistsError extends Error {
  public constructor() {
    super('Trainer already exists')
    this.name = 'TrainerAlreadyExistsError'
  }
}
