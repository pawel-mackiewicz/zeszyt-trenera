import type { UseCase } from '@/application/UseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { TrainerRepoPort } from '@/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterTrainerCommand } from '@/application/requests/RegisterTrainerCommand'
import { Trainer, TrainerAlreadyExistsError } from '@/domain/model/trainer'

export class RegisterTrainerUseCase implements UseCase<RegisterTrainerCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly trainerRepo: TrainerRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterTrainerCommand): Promise<void> {
    // Trainer setup follows the same singleton rule as club setup, so duplicates must fail before a write transaction starts.
    if (await this.trainerRepo.exists()) {
      throw new TrainerAlreadyExistsError()
    }

    await this.uow.execute(async () => {
      // The workflow owns identifier allocation so the aggregate stays deterministic in tests and isolated from infrastructure concerns.
      const event = Trainer.register(
        dto.trainerName,
        this.idGenerator.generate()
      )
      await this.trainerRepo.save(event.trainer)
      await this.eventRepo.save(event)
    })
  }
}
