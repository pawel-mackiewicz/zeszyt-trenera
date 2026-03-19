import { Club, ClubAlreadyExistsError } from '@/domain/model/club'
import type { UseCase } from '@/application/UseCase'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'

export class RegisterClubUseCase implements UseCase<RegisterClubCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clubRepo: ClubRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: RegisterClubCommand): Promise<void> {
    // The notebook supports a single club, so duplicate registration must fail before opening a unit of work.
    if (await this.clubRepo.exists()) {
      throw new ClubAlreadyExistsError()
    }

    await this.uow.execute(async () => {
      const event = Club.register(dto.clubName, dto.foundingDate)
      await this.clubRepo.save(event.club)
      await this.eventRepo.save(event)
    })
  }
}
