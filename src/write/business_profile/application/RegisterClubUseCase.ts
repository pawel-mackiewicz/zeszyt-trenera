import {
  Club,
  ClubAlreadyExistsError
} from '@/write/business_profile/domain/Club'
import type { UseCase } from '@/write/shared/UseCase'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { ClubRepoPort } from '@/write/business_profile/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { RegisterClubCommand } from '@/write/business_profile/application/commands/RegisterClubCommand'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'

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
      const [club, event] = Club.register(
        dto.clubName,
        dto.foundingDate,
        this.idGenerator.generate()
      )
      await this.clubRepo.save(club)
      await this.eventRepo.save(event)
    })
  }
}
