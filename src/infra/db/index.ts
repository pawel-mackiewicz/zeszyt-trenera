import Dexie, { type EntityTable } from 'dexie'

export type PersistedClub = {
  id: string
  name: string
  foundingDate: Date
  createdAt: Date
}

export type PersistedDomainEvent<TPayload> = {
  eventId: string
  eventName: string
  occurredAt: Date
  payload: TPayload
}

export class TrainerNotebookDb extends Dexie {
  public clubs!: EntityTable<PersistedClub, 'id'>
  public events!: EntityTable<PersistedDomainEvent<unknown>, 'eventId'>

  public constructor(databaseName = 'trainer-notebook') {
    super(databaseName)

    this.version(1).stores({
      clubs: 'id, _name'
    })

    this.version(2).stores({
      clubs: 'id, _name',
      events: 'eventId, eventName, occurredAt'
    })
  }
}

export const db = new TrainerNotebookDb()
