import { describe, expect, it, vi } from 'vitest'

import {
  InvalidResetConfirmationPhraseError,
  ResetApplicationDataUseCase
} from '@/system_management/app_reset/application/ResetApplicationDataUseCase'
import type { AppResetRepoPort } from '@/system_management/app_reset/application/ports/AppResetRepoPort'
import type { AppStateResetPort } from '@/system_management/app_reset/application/ports/AppStateResetPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'

describe('ResetApplicationDataUseCase', () => {
  it('clears all local data inside one unit of work', async () => {
    const appResetRepo: AppResetRepoPort = {
      clearAllData: vi.fn().mockResolvedValue(undefined)
    }
    const appStateReset: AppStateResetPort = {
      clearPersistedState: vi.fn().mockResolvedValue(undefined)
    }
    const unitOfWork: UnitOfWork = {
      execute: vi.fn(async (action) => await action())
    }
    const useCase = new ResetApplicationDataUseCase(
      unitOfWork,
      appResetRepo,
      appStateReset
    )

    await useCase.handle({
      confirmationPhrase: 'DELETE ALL DATA'
    })

    expect(unitOfWork.execute).toHaveBeenCalledTimes(1)
    expect(appResetRepo.clearAllData).toHaveBeenCalledTimes(1)
    expect(appStateReset.clearPersistedState).toHaveBeenCalledTimes(1)
  })

  it('accepts lower-case confirmation phrase', async () => {
    const appResetRepo: AppResetRepoPort = {
      clearAllData: vi.fn().mockResolvedValue(undefined)
    }
    const appStateReset: AppStateResetPort = {
      clearPersistedState: vi.fn().mockResolvedValue(undefined)
    }
    const unitOfWork: UnitOfWork = {
      execute: vi.fn(async (action) => await action())
    }
    const useCase = new ResetApplicationDataUseCase(
      unitOfWork,
      appResetRepo,
      appStateReset
    )

    await useCase.handle({
      confirmationPhrase: 'delete all data'
    })
    expect(unitOfWork.execute).toHaveBeenCalledTimes(1)
    expect(appResetRepo.clearAllData).toHaveBeenCalledTimes(1)
    expect(appStateReset.clearPersistedState).toHaveBeenCalledTimes(1)
  })

  it('rejects reset when confirmation phrase is invalid', async () => {
    const appResetRepo: AppResetRepoPort = {
      clearAllData: vi.fn().mockResolvedValue(undefined)
    }
    const appStateReset: AppStateResetPort = {
      clearPersistedState: vi.fn().mockResolvedValue(undefined)
    }
    const unitOfWork: UnitOfWork = {
      execute: vi.fn(async (action) => await action())
    }
    const useCase = new ResetApplicationDataUseCase(
      unitOfWork,
      appResetRepo,
      appStateReset
    )

    await expect(
      useCase.handle({
        confirmationPhrase: 'delete everything'
      })
    ).rejects.toBeInstanceOf(InvalidResetConfirmationPhraseError)
    expect(unitOfWork.execute).not.toHaveBeenCalled()
    expect(appResetRepo.clearAllData).not.toHaveBeenCalled()
    expect(appStateReset.clearPersistedState).not.toHaveBeenCalled()
  })
})
