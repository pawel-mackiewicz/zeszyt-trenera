export type DemoLifecycleState = 'uninitialized' | 'active' | 'dismissed'

export interface DemoLifecycleStorePort {
  readState(): Promise<DemoLifecycleState>
  writeState(state: DemoLifecycleState): Promise<void>
}
