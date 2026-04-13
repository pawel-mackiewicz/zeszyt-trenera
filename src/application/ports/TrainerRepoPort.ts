import type { Trainer } from '@/domain/model/Trainer'

export interface TrainerRepoPort {
  save(trainer: Trainer): Promise<void>
  exists(): Promise<boolean>
}
