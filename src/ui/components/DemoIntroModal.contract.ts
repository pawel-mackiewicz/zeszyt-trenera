// What: define one shared status contract for the demo intro modal. Why: using one enum-style prop across shell, tests, and stories keeps the modal API aligned with the broader "single status value" pattern planned for other modals.
export const DemoIntroModalStatus = {
  Hidden: 'hidden',
  Ready: 'ready',
  Pending: 'pending'
} as const

export type DemoIntroModalStatusValue =
  (typeof DemoIntroModalStatus)[keyof typeof DemoIntroModalStatus]
