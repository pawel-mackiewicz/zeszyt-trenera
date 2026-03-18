import { v7 as uuidv7 } from 'uuid'
import { DomainEvent } from '@/domain/events/DomainEvent'

export type ClubSnapshot = {
  id: string
  name: string
  foundingDate: Date
  createdAt: Date
}

export class Club {
  public readonly id: string
  private _createdAt: Date

  private _name: string
  private _foundingDate: Date

  private constructor(
    name: string,
    foundingDate: Date,
    id: string = uuidv7(),
    createdAt: Date = new Date()
  ) {
    this.id = id
    this._createdAt = createdAt
    this._name = name
    this._foundingDate = foundingDate
  }

  public static register(
    name: string,
    foundingDate: Date
  ): ClubCreatedDomainEvent {
    const newClub = new Club(name, foundingDate)
    return new ClubCreatedDomainEvent(newClub)
  }

  public static restore(snapshot: ClubSnapshot): Club {
    return new Club(
      snapshot.name,
      snapshot.foundingDate,
      snapshot.id,
      snapshot.createdAt
    )
  }

  // Persistence adapters and event serializers share one snapshot so stored club data cannot drift apart.
  public toSnapshot(): ClubSnapshot {
    return {
      id: this.id,
      name: this.name,
      foundingDate: this.foundingDate,
      createdAt: this.createdAt
    }
  }

  public get name() {
    return this._name
  }

  public get foundingDate() {
    return this._foundingDate
  }

  public get createdAt() {
    return this._createdAt
  }
}

export class ClubCreatedDomainEvent extends DomainEvent {
  public readonly eventName = 'club.created'

  constructor(public readonly club: Club) {
    super()
  }
}

export class ClubAlreadyExistsError extends Error {
  public constructor() {
    super('Club already exists')
    this.name = 'ClubAlreadyExistsError'
  }
}
