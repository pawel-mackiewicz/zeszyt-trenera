import type { UseCase } from '@/write/shared/UseCase'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { TrainerRepoPort } from '@/write/business_profile/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { RegisterTrainerCommand } from '@/write/business_profile/application/commands/RegisterTrainerCommand'
import {
  Trainer,
  TrainerAlreadyExistsError
} from '@/write/business_profile/domain/Trainer'

export class RegisterTrainerUseCase implements UseCase<RegisterTrainerCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly trainerRepo: TrainerRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterTrainerCommand): Promise<void> {
    await this.uow.execute(async () => {
      // The workflow owns identifier allocation so the aggregate stays deterministic in tests and isolated from infrastructure concerns.
      // check inside transaction to avoid race conditions
      if (await this.trainerRepo.exists()) {
        throw new TrainerAlreadyExistsError()
      }
      const [trainer, event] = Trainer.register(
        dto.trainerName,
        this.idGenerator.generate()
      )
      await this.trainerRepo.save(trainer)
      await this.eventRepo.save(event)
    })
  }
}
