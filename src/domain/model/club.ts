import { DomainEvent } from '@/domain/events/DomainEvent'

// Domain dates stay behind defensive copies because Date mutators would otherwise let callers rewrite aggregate history.
const copyDate = (value: Date): Date => new Date(value.getTime())

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
    id: string,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this._createdAt = copyDate(createdAt)
    this._name = name
    this._foundingDate = copyDate(foundingDate)
  }

  public static register(
    name: string,
    foundingDate: Date,
    id: string
  ): [Club, ClubCreatedDomainEvent] {
    // Registration receives the ID from outside so the aggregate does not depend on external identifier generators.
    const club = new Club(name, foundingDate, id)
    const event = new ClubCreatedDomainEvent(club.toSnapshot())
    return [club, event]
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
    return copyDate(this._foundingDate)
  }

  public get createdAt() {
    return copyDate(this._createdAt)
  }
}

export class ClubCreatedDomainEvent extends DomainEvent<ClubSnapshot> {
  public readonly eventName = 'club.created'

  public constructor(club: ClubSnapshot) {
    // The payload is the canonical replay contract so persistence adapters can store new event types without per-event translation logic.
    super(club)
  }
}

export class ClubAlreadyExistsError extends Error {
  public constructor() {
    super('Club already exists')
    this.name = 'ClubAlreadyExistsError'
  }
}
