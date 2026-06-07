import { APP_OWNED_LOCAL_STORAGE_KEYS } from '@/appStorageKeys'
import type { AppStateResetPort } from '@/system_management/app_reset/application/ports/AppStateResetPort'

type AppStateStorage = Pick<Storage, 'removeItem'>

export class LocalStorageAppStateResetter implements AppStateResetPort {
  public constructor(
    private readonly storage: AppStateStorage = window.localStorage
  ) {}

  public async clearPersistedState(): Promise<void> {
    for (const key of APP_OWNED_LOCAL_STORAGE_KEYS) {
      try {
        // Why: a full reset must also clear app-owned browser state so the next cold boot cannot resurrect stale local-first shell flags from outside Dexie.
        this.storage.removeItem(key)
      } catch {
        // Why: some browsers can block storage access entirely, but that should not turn a completed data wipe into a fatal reset error.
      }
    }
  }
}
