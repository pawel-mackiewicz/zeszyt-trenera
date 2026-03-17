import Dexie, { type EntityTable } from 'dexie'

import type { Club } from '@/domain/model/club'

export type PersistedDomainEvent<TPayload> = {
  eventId: string
  eventName: string
  occurredAt: Date
  payload: TPayload
}

export class TrainerNotebookDb extends Dexie {
  public clubs!: EntityTable<Club, 'id'>
  public events!: EntityTable<PersistedDomainEvent<unknown>, 'eventId'>

  public constructor() {
    super('trainer-notebook')

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
