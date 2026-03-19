import type { Trainer } from '@/domain/model/trainer'

export interface TrainerRepoPort {
  save(trainer: Trainer): Promise<void>
  exists(): Promise<boolean>
}
