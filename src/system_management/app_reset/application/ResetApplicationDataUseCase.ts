import type { AppStateResetPort } from '@/system_management/app_reset/application/ports/AppStateResetPort'
import type { AppResetRepoPort } from '@/system_management/app_reset/application/ports/AppResetRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import {
  normalizeResetConfirmationPhrase,
  RESET_APPLICATION_CONFIRMATION_PHRASE,
  type ResetApplicationDataCommand
} from '@/system_management/app_reset/application/requests/ResetApplicationDataCommand'
import type { UseCase } from '@/write/shared/UseCase'

export class InvalidResetConfirmationPhraseError extends Error {
  public constructor() {
    super('Reset confirmation phrase is invalid.')
  }
}

export class ResetApplicationDataUseCase implements UseCase<ResetApplicationDataCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly appResetRepo: AppResetRepoPort,
    private readonly appStateReset: AppStateResetPort
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

    // Why: Dexie reset alone is not enough for a true factory reset because the shell also keeps a small amount of browser state outside the database.
    await this.appStateReset.clearPersistedState()
  }
}
