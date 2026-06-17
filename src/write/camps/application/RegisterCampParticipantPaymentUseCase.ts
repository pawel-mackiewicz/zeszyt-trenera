import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantPaymentCommand } from '@/write/camps/application/requests/RegisterCampParticipantPaymentCommand'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'
import { Money } from '@/write/shared/vo/Money'

export class RegisterCampParticipantPaymentUseCase implements UseCase<RegisterCampParticipantPaymentCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campParticipantRepo: CampParticipantRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(
    command: RegisterCampParticipantPaymentCommand
  ): Promise<void> {
    await this.uow.execute(async () => {
      const existingParticipant = await this.campParticipantRepo.findById(
        command.participantId
      )

      if (!existingParticipant) {
        throw new CampParticipantNotFoundForPaymentRegistrationError(
          command.participantId
        )
      }

      if (existingParticipant.campId !== command.campId) {
        throw new CampParticipantCampMismatchForPaymentRegistrationError(
          command.campId,
          existingParticipant.campId
        )
      }

      const amount = Money.create(command.amount)
      const [participant, event] = existingParticipant.registerPayment({
        id: this.idGenerator.generate(),
        amount,
        note: command.note
      })

      await this.campParticipantRepo.update(participant)
      await this.eventRepo.save(event)
    })
  }
}

export class CampParticipantNotFoundForPaymentRegistrationError extends Error {
  public constructor(participantId: string) {
    super(
      `Camp participant not found for payment registration: ${participantId}`
    )
    this.name = 'CampParticipantNotFoundForPaymentRegistrationError'
  }
}

export class CampParticipantCampMismatchForPaymentRegistrationError extends Error {
  public constructor(expectedCampId: string, actualCampId: string) {
    super(
      `Camp participant belongs to camp ${actualCampId}, not ${expectedCampId}`
    )
    this.name = 'CampParticipantCampMismatchForPaymentRegistrationError'
  }
}
