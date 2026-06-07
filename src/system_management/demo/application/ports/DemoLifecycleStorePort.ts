export type DemoLifecycleState = 'uninitialized' | 'dismissed'

export interface DemoLifecycleStorePort {
  readState(): Promise<DemoLifecycleState>
  writeState(state: DemoLifecycleState): Promise<void>
  readDemoModeActive(): Promise<boolean>
  writeDemoModeActive(active: boolean): Promise<void>
}
