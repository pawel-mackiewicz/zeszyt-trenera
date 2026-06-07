import { describe, expect, it, vi } from 'vitest'

import { LeaveDemoModeUseCase } from '@/system_management/demo/application/LeaveDemoModeUseCase'
import type { AppResetRepoPort } from '@/system_management/app_reset/application/ports/AppResetRepoPort'
import type { DemoLifecycleStorePort } from '@/system_management/demo/application/ports/DemoLifecycleStorePort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'

describe('LeaveDemoModeUseCase', () => {
  it('clears the notebook and marks demo mode as dismissed', async () => {
    const unitOfWork: UnitOfWork = {
      execute: async <T>(action: () => Promise<T>) => await action()
    }
    const appResetRepo: AppResetRepoPort = {
      clearAllData: vi.fn().mockResolvedValue(undefined)
    }
    const demoLifecycleStore: DemoLifecycleStorePort = {
      readState: vi.fn().mockResolvedValue('uninitialized'),
      writeState: vi.fn().mockResolvedValue(undefined),
      readDemoModeActive: vi.fn().mockResolvedValue(true),
      writeDemoModeActive: vi.fn().mockResolvedValue(undefined)
    }
    const useCase = new LeaveDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toBeUndefined()
    expect(appResetRepo.clearAllData).toHaveBeenCalledTimes(1)
    expect(demoLifecycleStore.writeState).toHaveBeenCalledWith('dismissed')
    expect(demoLifecycleStore.writeDemoModeActive).toHaveBeenCalledWith(false)
  })
})
