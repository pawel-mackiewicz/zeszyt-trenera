import Dexie, { type EntityTable } from 'dexie'

import type { Club } from '@/domain/model/club'

export class TrainerNotebookDb extends Dexie {
  public clubs!: EntityTable<Club, 'id'>

  public constructor() {
    super('trainer-notebook')

    this.version(1).stores({
      clubs: 'id, _name',
    })
  }
}

export const db = new TrainerNotebookDb()

//now add frontend part