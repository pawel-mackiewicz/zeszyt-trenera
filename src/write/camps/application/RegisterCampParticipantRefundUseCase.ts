import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantRefundCommand } from '@/write/camps/application/requests/RegisterCampParticipantRefundCommand'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'
import { Money } from '@/write/shared/vo/Money'

export class RegisterCampParticipantRefundUseCase implements UseCase<RegisterCampParticipantRefundCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campParticipantRepo: CampParticipantRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(
    command: RegisterCampParticipantRefundCommand
  ): Promise<void> {
    await this.uow.execute(async () => {
      const existingParticipant = await this.campParticipantRepo.findById(
        command.participantId
      )

      if (!existingParticipant) {
        throw new CampParticipantNotFoundForRefundRegistrationError(
          command.participantId
        )
      }

      if (existingParticipant.campId !== command.campId) {
        throw new CampParticipantCampMismatchForRefundRegistrationError(
          command.campId,
          existingParticipant.campId
        )
      }

      const amount = Money.create(command.amount)
      const [participant, event] = existingParticipant.registerRefund({
        id: this.idGenerator.generate(),
        amount,
        note: command.note
      })

      await this.campParticipantRepo.update(participant)
      await this.eventRepo.save(event)
    })
  }
}

export class CampParticipantNotFoundForRefundRegistrationError extends Error {
  public constructor(participantId: string) {
    super(
      `Camp participant not found for refund registration: ${participantId}`
    )
    this.name = 'CampParticipantNotFoundForRefundRegistrationError'
  }
}

export class CampParticipantCampMismatchForRefundRegistrationError extends Error {
  public constructor(expectedCampId: string, actualCampId: string) {
    super(
      `Camp participant belongs to camp ${actualCampId}, not ${expectedCampId}`
    )
    this.name = 'CampParticipantCampMismatchForRefundRegistrationError'
  }
}
