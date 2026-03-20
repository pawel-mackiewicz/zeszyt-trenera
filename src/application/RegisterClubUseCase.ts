import { Club, ClubAlreadyExistsError } from '@/domain/model/club'
import type { UseCase } from '@/application/UseCase'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'

export class RegisterClubUseCase implements UseCase<RegisterClubCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clubRepo: ClubRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterClubCommand): Promise<void> {
    await this.uow.execute(async () => {
      // The notebook supports a single club, so duplicate registration must fail before opening a unit of work.
      // inside transaction to avoid race conditions
      if (await this.clubRepo.exists()) {
        throw new ClubAlreadyExistsError()
      }
      // The use case decides when a new club ID is allocated, while the generator stays injected for deterministic tests and infrastructure isolation.
      const event = Club.register(
        dto.clubName,
        dto.foundingDate,
        this.idGenerator.generate()
      )
      await this.clubRepo.save(event.club)
      await this.eventRepo.save(event)
    })
  }
}
