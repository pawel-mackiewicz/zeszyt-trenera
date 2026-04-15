import type { Trainer } from '@/write/domain/model/Trainer'

export interface TrainerRepoPort {
  save(trainer: Trainer): Promise<void>
  exists(): Promise<boolean>
}
