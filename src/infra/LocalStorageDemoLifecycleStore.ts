import type {
  DemoLifecycleState,
  DemoLifecycleStorePort
} from '@/application/ports/DemoLifecycleStorePort'

export const DEMO_LIFECYCLE_STORAGE_KEY = 'zeszyt-trenera.demo-lifecycle'

type LifecycleStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

function normalizeDemoLifecycleState(
  value: string | null | undefined
): DemoLifecycleState {
  if (value === 'active' || value === 'dismissed') {
    return value
  }

  return 'uninitialized'
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
}
