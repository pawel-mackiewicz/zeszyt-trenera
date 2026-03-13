import Dexie from 'dexie'

export class TrainerNotebookDb extends Dexie {
  public constructor() {
    super('trainer-notebook')

    // Reserve schema versioning up front so future tables can land without reworking bootstrapping.
    this.version(1).stores({})
  }
}

export const db = new TrainerNotebookDb()
