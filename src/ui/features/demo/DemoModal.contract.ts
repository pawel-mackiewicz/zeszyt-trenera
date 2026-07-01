// What: define one shared status contract for demo modals. Why: intro/outro modals share shell readiness and visibility rules while the outro path also needs an explicit pending state.
export const DemoModalStatus = {
  Hidden: 'hidden',
  Ready: 'ready',
  Pending: 'pending'
} as const

export type DemoModalStatusValue =
  (typeof DemoModalStatus)[keyof typeof DemoModalStatus]
