// What: define one shared status contract for the install modal. Why: one explicit status value keeps shell wiring, stories, and tests aligned without drifting boolean combinations.
export const InstallModalStatus = {
  Hidden: 'hidden',
  NativeReady: 'native-ready',
  NativePending: 'native-pending',
  ManualReady: 'manual-ready'
} as const

export type InstallModalStatusValue =
  (typeof InstallModalStatus)[keyof typeof InstallModalStatus]
