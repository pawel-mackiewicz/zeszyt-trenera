import { describe, expect, it, vi } from 'vitest'

import { LeaveDemoModeUseCase } from '@/application/LeaveDemoModeUseCase'
import type { AppResetRepoPort } from '@/application/ports/AppResetRepoPort'
import type { DemoLifecycleStorePort } from '@/application/ports/DemoLifecycleStorePort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'

describe('LeaveDemoModeUseCase', () => {
  it('clears the notebook and marks demo mode as dismissed', async () => {
    const unitOfWork: UnitOfWork = {
      execute: async <T>(action: () => Promise<T>) => await action()
    }
    const appResetRepo: AppResetRepoPort = {
      clearAllData: vi.fn().mockResolvedValue(undefined)
    }
    const demoLifecycleStore: DemoLifecycleStorePort = {
      readState: vi.fn().mockResolvedValue('active'),
      writeState: vi.fn().mockResolvedValue(undefined)
    }
    const useCase = new LeaveDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toBeUndefined()
    expect(appResetRepo.clearAllData).toHaveBeenCalledTimes(1)
    expect(demoLifecycleStore.writeState).toHaveBeenCalledWith('dismissed')
  })
})
