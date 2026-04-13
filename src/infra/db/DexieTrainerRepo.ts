import type { TrainerRepoPort } from '@/application/ports/TrainerRepoPort'
import type { Trainer } from '@/domain/model/Trainer'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedTrainer } from '@/infra'

export class DexieTrainerRepo implements TrainerRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(trainer: Trainer): Promise<void> {
    await this.database.trainers.add(this.toPersistedTrainer(trainer))
  }

  public async exists(): Promise<boolean> {
    // Trainer setup only needs a singleton guard today, so existence stays a cheap query instead of forcing a full hydrate path.
    const persistedTrainer = await this.database.trainers.toCollection().first()

    return persistedTrainer != null
  }

  private toPersistedTrainer(trainer: Trainer): PersistedTrainer {
    return trainer.toSnapshot()
  }
}
