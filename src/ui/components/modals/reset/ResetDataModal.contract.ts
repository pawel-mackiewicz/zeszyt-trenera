// What: define one shared status contract for the reset-data modal. Why: a single enum-style value keeps shell wiring, stories, and specs aligned without drifting boolean combinations.
export const ResetDataModalStatus = {
  Hidden: 'hidden',
  Ready: 'ready',
  Pending: 'pending'
} as const

export type ResetDataModalStatusValue =
  (typeof ResetDataModalStatus)[keyof typeof ResetDataModalStatus]
