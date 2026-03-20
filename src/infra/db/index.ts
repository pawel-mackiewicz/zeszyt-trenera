import Dexie, { type EntityTable } from 'dexie'

export type PersistedClub = {
  id: string
  name: string
  foundingDate: Date
  createdAt: Date
}

export type PersistedTrainer = {
  id: string
  name: string
  createdAt: Date
}

export type PersistedMember = {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth?: Date
  joinedAt?: Date
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
  public trainers!: EntityTable<PersistedTrainer, 'id'>
  public members!: EntityTable<PersistedMember, 'id'>
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

    this.version(3).stores({
      clubs: 'id, _name',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id, name'
    })

    this.version(4).stores({
      clubs: 'id, _name',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id, name',
      // The compound identity index lets offline duplicate checks stay deterministic without scanning the whole member table.
      members: 'id, [firstName+lastName+phoneNumber]'
    })

    this.version(5).stores({
      // The local-first schema must index the persisted club snapshot contract, not the aggregate's private field names.
      clubs: 'id, name',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id, name',
      // The compound identity index lets offline duplicate checks stay deterministic without scanning the whole member table.
      members: 'id, [firstName+lastName+phoneNumber]'
    })

    this.version(6).stores({
      // Club and trainer setup stays single-record today, so removing unused name indexes avoids extra write work on mobile devices.
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // The compound identity index lets offline duplicate checks stay deterministic without scanning the whole member table.
      members: 'id, [firstName+lastName+phoneNumber]'
    })
  }
}

export const db = new TrainerNotebookDb()
