import type { CampRepoPort } from '@/write/camps/application/CampRepoPort'
import type { RegisterCampCommand } from '@/write/camps/application/requests/RegisterCampCommand'
import { Camp } from '@/write/camps/domain/Camp'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import { Money } from '@/write/shared/vo/Money'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'

export class RegisterCampUseCase implements UseCase<RegisterCampCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campRepo: CampRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterCampCommand): Promise<void> {
    await this.uow.execute(async () => {
      const [camp, event] = this.registerCamp(dto)

      await this.campRepo.save(camp)
      await this.eventRepo.save(event)
    })
  }

  private registerCamp(dto: RegisterCampCommand) {
    // The use case owns command-shape conversion and ID allocation so the aggregate receives domain values while persistence and events store the same snapshot.
    return Camp.register(
      {
        name: dto.name,
        note: dto.note,
        startDate: dto.startDate,
        price: Money.create(dto.price)
      },
      this.idGenerator.generate()
    )
  }
}
