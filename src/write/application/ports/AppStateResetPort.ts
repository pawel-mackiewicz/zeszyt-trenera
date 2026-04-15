export interface AppStateResetPort {
  clearPersistedState(): Promise<void>
}
