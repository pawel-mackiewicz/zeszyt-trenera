import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantDiscountCommand } from '@/write/camps/application/requests/RegisterCampParticipantDiscountCommand'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'
import { Money } from '@/write/shared/vo/Money'

export class RegisterCampParticipantDiscountUseCase implements UseCase<RegisterCampParticipantDiscountCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campParticipantRepo: CampParticipantRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(
    command: RegisterCampParticipantDiscountCommand
  ): Promise<void> {
    await this.uow.execute(async () => {
      const existingParticipant = await this.campParticipantRepo.findById(
        command.participantId
      )

      if (!existingParticipant) {
        throw new CampParticipantNotFoundForDiscountRegistrationError(
          command.participantId
        )
      }

      if (existingParticipant.campId !== command.campId) {
        throw new CampParticipantCampMismatchForDiscountRegistrationError(
          command.campId,
          existingParticipant.campId
        )
      }

      const amount = Money.create(command.amount)
      const [participant, event] = existingParticipant.applyDiscount({
        id: this.idGenerator.generate(),
        amount,
        reason: command.reason
      })

      await this.campParticipantRepo.update(participant)
      await this.eventRepo.save(event)
    })
  }
}

export class CampParticipantNotFoundForDiscountRegistrationError extends Error {
  public constructor(participantId: string) {
    super(
      `Camp participant not found for discount registration: ${participantId}`
    )
    this.name = 'CampParticipantNotFoundForDiscountRegistrationError'
  }
}

export class CampParticipantCampMismatchForDiscountRegistrationError extends Error {
  public constructor(expectedCampId: string, actualCampId: string) {
    super(
      `Camp participant belongs to camp ${actualCampId}, not ${expectedCampId}`
    )
    this.name = 'CampParticipantCampMismatchForDiscountRegistrationError'
  }
}
