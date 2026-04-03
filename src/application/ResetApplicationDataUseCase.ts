import type { AppResetRepoPort } from '@/application/ports/AppResetRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import {
  normalizeResetConfirmationPhrase,
  RESET_APPLICATION_CONFIRMATION_PHRASE,
  type ResetApplicationDataCommand
} from '@/application/requests/ResetApplicationDataCommand'
import type { UseCase } from '@/application/UseCase'

export class InvalidResetConfirmationPhraseError extends Error {
  public constructor() {
    super('Reset confirmation phrase is invalid.')
  }
}

export class ResetApplicationDataUseCase implements UseCase<ResetApplicationDataCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly appResetRepo: AppResetRepoPort
  ) {}

  public async handle(request: ResetApplicationDataCommand): Promise<void> {
    if (
      normalizeResetConfirmationPhrase(request.confirmationPhrase) !==
      RESET_APPLICATION_CONFIRMATION_PHRASE
    ) {
      // The use case validates destructive intent too so no future adapter can bypass the same safety phrase with a direct workflow call.
      throw new InvalidResetConfirmationPhraseError()
    }

    // Clearing every local record must be atomic so a mobile crash cannot leave the notebook half-reset.
    await this.unitOfWork.execute(async () => {
      await this.appResetRepo.clearAllData()
    })
  }
}
