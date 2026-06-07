import type { Trainer } from '@/write/business_profile/domain/Trainer'

export interface TrainerRepoPort {
  save(trainer: Trainer): Promise<void>
  exists(): Promise<boolean>
}

export class FakeTrainerRepo implements TrainerRepoPort {
  public readonly savedTrainers: Trainer[] = []
  public loadedTrainer: Trainer | undefined

  async save(trainer: Trainer): Promise<void> {
    this.savedTrainers.push(trainer)
  }

  async exists(): Promise<boolean> {
    return this.loadedTrainer != null
  }
}
