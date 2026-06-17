import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { CancelCampParticipantResignationCommand } from '@/write/camps/application/requests/CancelCampParticipantResignationCommand'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'

export class CancelCampParticipantResignationUseCase implements UseCase<CancelCampParticipantResignationCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campParticipantRepo: CampParticipantRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(
    command: CancelCampParticipantResignationCommand
  ): Promise<void> {
    await this.uow.execute(async () => {
      const existingParticipant = await this.campParticipantRepo.findById(
        command.participantId
      )

      if (!existingParticipant) {
        throw new CampParticipantNotFoundForResignationCancellationError(
          command.participantId
        )
      }

      if (existingParticipant.campId !== command.campId) {
        throw new CampParticipantCampMismatchForResignationCancellationError(
          command.campId,
          existingParticipant.campId
        )
      }

      const [participant, event] = existingParticipant.cancelResignation(() =>
        this.idGenerator.generate()
      )

      await this.campParticipantRepo.update(participant)
      await this.eventRepo.save(event)
    })
  }
}

export class CampParticipantNotFoundForResignationCancellationError extends Error {
  public constructor(participantId: string) {
    super(
      `Camp participant not found for resignation cancellation: ${participantId}`
    )
    this.name = 'CampParticipantNotFoundForResignationCancellationError'
  }
}

export class CampParticipantCampMismatchForResignationCancellationError extends Error {
  public constructor(expectedCampId: string, actualCampId: string) {
    super(
      `Camp participant belongs to camp ${actualCampId}, not ${expectedCampId}`
    )
    this.name = 'CampParticipantCampMismatchForResignationCancellationError'
  }
}
