import { v7 as uuidv7 } from 'uuid'
import { DomainEvent } from '@/domain/events/DomainEvent'

export type TrainerSnapshot = {
  id: string
  name: string
  createdAt: Date
}

export class Trainer {
  public readonly id: string
  public readonly createdAt: Date

  private _name: string

  private constructor(
    name: string,
    id: string = uuidv7(),
    createdAt: Date = new Date()
  ) {
    this.id = id
    this.createdAt = createdAt
    this._name = name
  }

  public static register(name: string): TrainerCreatedDomainEvent {
    const newTrainer = new Trainer(name)
    return new TrainerCreatedDomainEvent(newTrainer)
  }

  public static restore(snapshot: TrainerSnapshot): Trainer {
    return new Trainer(snapshot.name, snapshot.id, snapshot.createdAt)
  }

  public get name() {
    return this._name
  }
}

export class TrainerCreatedDomainEvent extends DomainEvent {
  public readonly eventName = 'trainer.created'

  constructor(public readonly trainer: Trainer) {
    super()
  }
}
