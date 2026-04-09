import type {
  DemoLifecycleState,
  DemoLifecycleStorePort
} from '@/application/ports/DemoLifecycleStorePort'
import {
  DEMO_LIFECYCLE_STORAGE_KEY,
  DEMO_MODE_ACTIVE_STORAGE_KEY
} from '@/appStorageKeys'

type LifecycleStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

function normalizeDemoLifecycleState(
  value: string | null | undefined
): DemoLifecycleState {
  if (value === 'dismissed') {
    return value
  }

  return 'uninitialized'
}

function normalizeDemoModeActive(value: string | null | undefined): boolean {
  return value === '1'
}

export class LocalStorageDemoLifecycleStore implements DemoLifecycleStorePort {
  public constructor(
    private readonly storage: LifecycleStorage = window.localStorage
  ) {}

  public async readState(): Promise<DemoLifecycleState> {
    try {
      return normalizeDemoLifecycleState(
        this.storage.getItem(DEMO_LIFECYCLE_STORAGE_KEY)
      )
    } catch {
      // Why: the local-first shell should still open even when this browser blocks preference storage, even if that means demo-mode dismissal cannot persist across launches.
      return 'uninitialized'
    }
  }

  public async writeState(state: DemoLifecycleState): Promise<void> {
    try {
      if (state === 'uninitialized') {
        this.storage.removeItem(DEMO_LIFECYCLE_STORAGE_KEY)
        return
      }

      // Why: the lifecycle choice is tiny UI/bootstrap state, so localStorage keeps it alive even when the entire Dexie notebook is intentionally wiped.
      this.storage.setItem(DEMO_LIFECYCLE_STORAGE_KEY, state)
    } catch {
      // Why: failing to persist this preference should not block the current session from continuing through demo or setup flows.
    }
  }

  public async readDemoModeActive(): Promise<boolean> {
    try {
      const persistedDemoMode = this.storage.getItem(
        DEMO_MODE_ACTIVE_STORAGE_KEY
      )

      if (persistedDemoMode !== null) {
        return normalizeDemoModeActive(persistedDemoMode)
      }

      // Why: older installed builds stored "active" on the lifecycle key itself, so the upgraded PWA still has to recognize existing demo notebooks after the first refreshed boot.
      return this.storage.getItem(DEMO_LIFECYCLE_STORAGE_KEY) === 'active'
    } catch {
      // Why: the shell should keep rendering even when storage access is blocked, even if demo-mode chrome cannot survive a full reload on that device.
      return false
    }
  }

  public async writeDemoModeActive(active: boolean): Promise<void> {
    try {
      if (active) {
        // Why: the active-demo flag answers "what notebook is open right now" without overloading the dismissal preference that decides future auto-seeding.
        this.storage.setItem(DEMO_MODE_ACTIVE_STORAGE_KEY, '1')
      } else {
        this.storage.removeItem(DEMO_MODE_ACTIVE_STORAGE_KEY)
      }

      // Why: once the split flags exist, the legacy "active" lifecycle value becomes ambiguous and should not keep shadowing the new source of truth on later boots.
      if (this.storage.getItem(DEMO_LIFECYCLE_STORAGE_KEY) === 'active') {
        this.storage.removeItem(DEMO_LIFECYCLE_STORAGE_KEY)
      }
    } catch {
      // Why: losing this cosmetic bootstrap flag is acceptable during the current session because the shell still keeps the in-memory state until the next launch.
    }
  }
}
