import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { AcceptCampParticipantResignationCommand } from '@/write/camps/application/requests/AcceptCampParticipantResignationCommand'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'
import { Money } from '@/write/shared/vo/Money'

export class AcceptCampParticipantResignationUseCase implements UseCase<AcceptCampParticipantResignationCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campParticipantRepo: CampParticipantRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(
    command: AcceptCampParticipantResignationCommand
  ): Promise<void> {
    await this.uow.execute(async () => {
      const existingParticipant = await this.campParticipantRepo.findById(
        command.participantId
      )

      if (!existingParticipant) {
        throw new CampParticipantNotFoundForResignationAcceptanceError(
          command.participantId
        )
      }

      if (existingParticipant.campId !== command.campId) {
        throw new CampParticipantCampMismatchForResignationAcceptanceError(
          command.campId,
          existingParticipant.campId
        )
      }

      let participant = existingParticipant.resign(
        command.nonRefundableDepositValue
          ? {
              id: this.idGenerator.generate(),
              amount: Money.create(command.nonRefundableDepositValue),
              note: ''
            }
          : undefined
      )

      if (command.refundedValue) {
        const refundedParticipant = participant.registerRefund({
          id: this.idGenerator.generate(),
          amount: Money.create(command.refundedValue),
          note: ''
        })

        participant = refundedParticipant
      }

      await this.campParticipantRepo.update(participant)
    })
  }
}

export class CampParticipantNotFoundForResignationAcceptanceError extends Error {
  public constructor(participantId: string) {
    super(
      `Camp participant not found for resignation acceptance: ${participantId}`
    )
    this.name = 'CampParticipantNotFoundForResignationAcceptanceError'
  }
}

export class CampParticipantCampMismatchForResignationAcceptanceError extends Error {
  public constructor(expectedCampId: string, actualCampId: string) {
    super(
      `Camp participant belongs to camp ${actualCampId}, not ${expectedCampId}`
    )
    this.name = 'CampParticipantCampMismatchForResignationAcceptanceError'
  }
}
