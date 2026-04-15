export const RESET_APPLICATION_CONFIRMATION_PHRASE = 'DELETE ALL DATA'

export function normalizeResetConfirmationPhrase(value: string): string {
  return value.trim().toLocaleUpperCase()
}

export type ResetApplicationDataCommand = {
  confirmationPhrase: string
}
