import { describe, expect, it, vi } from 'vitest'

import {
  DEMO_LIFECYCLE_STORAGE_KEY,
  DEMO_MODE_ACTIVE_STORAGE_KEY
} from '@/appStorageKeys'
import { LocalStorageDemoLifecycleStore } from '@/write/infra/LocalStorageDemoLifecycleStore'

describe('LocalStorageDemoLifecycleStore', () => {
  it('treats only the dismissal marker as lifecycle state', async () => {
    const storage = {
      getItem: vi.fn((key: string) =>
        key === DEMO_LIFECYCLE_STORAGE_KEY ? 'dismissed' : null
      ),
      removeItem: vi.fn(),
      setItem: vi.fn()
    }
    const store = new LocalStorageDemoLifecycleStore(storage)

    await expect(store.readState()).resolves.toBe('dismissed')
    expect(storage.getItem).toHaveBeenCalledWith(DEMO_LIFECYCLE_STORAGE_KEY)
  })

  it('reads the active demo flag from the dedicated storage key', async () => {
    const storage = {
      getItem: vi.fn((key: string) =>
        key === DEMO_MODE_ACTIVE_STORAGE_KEY ? '1' : null
      ),
      removeItem: vi.fn(),
      setItem: vi.fn()
    }
    const store = new LocalStorageDemoLifecycleStore(storage)

    await expect(store.readDemoModeActive()).resolves.toBe(true)
  })

  it('keeps recognizing legacy active-demo lifecycle values after an upgrade', async () => {
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === DEMO_MODE_ACTIVE_STORAGE_KEY) {
          return null
        }

        return key === DEMO_LIFECYCLE_STORAGE_KEY ? 'active' : null
      }),
      removeItem: vi.fn(),
      setItem: vi.fn()
    }
    const store = new LocalStorageDemoLifecycleStore(storage)

    await expect(store.readDemoModeActive()).resolves.toBe(true)
  })

  it('writes the active demo flag without leaving the legacy lifecycle value behind', async () => {
    const storage = {
      getItem: vi.fn((key: string) =>
        key === DEMO_LIFECYCLE_STORAGE_KEY ? 'active' : null
      ),
      removeItem: vi.fn(),
      setItem: vi.fn()
    }
    const store = new LocalStorageDemoLifecycleStore(storage)

    await expect(store.writeDemoModeActive(true)).resolves.toBeUndefined()
    expect(storage.setItem).toHaveBeenCalledWith(
      DEMO_MODE_ACTIVE_STORAGE_KEY,
      '1'
    )
    expect(storage.removeItem).toHaveBeenCalledWith(DEMO_LIFECYCLE_STORAGE_KEY)
  })
})
