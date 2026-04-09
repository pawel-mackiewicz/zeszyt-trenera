// Why: one shared state map keeps bootstrap policy, adapters, and tests aligned without repeating fragile string literals.
export const NOTEBOOK_BOOTSTRAP_STATES = {
  EMPTY: 'empty',
  SETUP_INCOMPLETE: 'setup-incomplete',
  SETUP_READY: 'setup-ready'
} as const

export type NotebookBootstrapState =
  (typeof NOTEBOOK_BOOTSTRAP_STATES)[keyof typeof NOTEBOOK_BOOTSTRAP_STATES]

export interface NotebookBootstrapStatePort {
  readBootstrapState(): Promise<NotebookBootstrapState>
}
