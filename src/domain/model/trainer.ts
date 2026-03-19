import { DomainEvent } from '@/domain/events/DomainEvent'

// Domain dates stay behind defensive copies because Date mutators would otherwise let callers rewrite aggregate history.
const copyDate = (value: Date): Date => new Date(value.getTime())

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

  public static register(name: string, id: string): TrainerCreatedDomainEvent {
    // Registration receives the ID from outside so the aggregate stays independent from infrastructure ID generators.
    const newTrainer = new Trainer(name, id)
    return new TrainerCreatedDomainEvent(newTrainer)
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

export class TrainerCreatedDomainEvent extends DomainEvent {
  public readonly eventName = 'trainer.created'

  constructor(public readonly trainer: Trainer) {
    super()
  }
}

export class TrainerAlreadyExistsError extends Error {
  public constructor() {
    super('Trainer already exists')
    this.name = 'TrainerAlreadyExistsError'
  }
}
