import { v7 as uuidv7 } from 'uuid'
import { DomainEvent } from '@/domain/events/DomainEvent'

export class Club {
  public readonly id: string
  private _createdAt: Date

  private _name: string
  private _foundingDate: Date

  private constructor(name: string, foundingDate: Date) {
    this.id = uuidv7()
    this._createdAt = new Date()
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
