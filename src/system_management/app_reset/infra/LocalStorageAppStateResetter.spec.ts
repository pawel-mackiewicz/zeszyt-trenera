import { describe, expect, it, vi } from 'vitest'

import {
  APP_LOCALE_STORAGE_KEY,
  ATTENDANCE_DRAFT_STORAGE_KEY,
  DEMO_LIFECYCLE_STORAGE_KEY,
  DEMO_MODE_ACTIVE_STORAGE_KEY,
  INSTALL_MODAL_SHOWN_STORAGE_KEY
} from '@/appStorageKeys'
import { LocalStorageAppStateResetter } from '@/system_management/app_reset/infra/LocalStorageAppStateResetter'

describe('LocalStorageAppStateResetter', () => {
  it('removes every app-owned localStorage key', async () => {
    const storage = {
      removeItem: vi.fn()
    }
    const resetter = new LocalStorageAppStateResetter(storage)

    await resetter.clearPersistedState()

    expect(storage.removeItem.mock.calls).toEqual([
      [APP_LOCALE_STORAGE_KEY],
      [INSTALL_MODAL_SHOWN_STORAGE_KEY],
      [DEMO_LIFECYCLE_STORAGE_KEY],
      [DEMO_MODE_ACTIVE_STORAGE_KEY],
      [ATTENDANCE_DRAFT_STORAGE_KEY]
    ])
  })

  it('tolerates storage removal failures so reset can stay best-effort', async () => {
    const storage = {
      removeItem: vi.fn(() => {
        throw new Error('blocked')
      })
    }
    const resetter = new LocalStorageAppStateResetter(storage)

    await expect(resetter.clearPersistedState()).resolves.toBeUndefined()
    expect(storage.removeItem).toHaveBeenCalledTimes(5)
  })
})
