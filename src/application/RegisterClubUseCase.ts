import { Club } from '@/domain/model/club'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'

export class RegisterClubUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clubRepo: ClubRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: RegisterClubCommand): Promise<void> {
    const event = Club.register(dto.clubName, dto.foundingDate)

    await this.uow.execute(async () => {
      await this.clubRepo.save(event.club)
      await this.eventRepo.save(event)
    })
  }
}
