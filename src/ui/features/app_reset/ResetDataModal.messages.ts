// What: keep reset modal copy in a typed shared module consumed by UI, tests, and stories. Why: one source of truth removes duplicated literals and keeps locale contracts stable during copy updates.
export const RESET_DATA_MODAL_MESSAGES = {
  pl: {
    reset: {
      title: 'Usuń wszystkie dane aplikacji',
      copy: 'To usunie wszystkich członków, treningi, płatności, konfigurację klubu i trenera oraz lokalne ustawienia aplikacji zapisane na tym urządzeniu.',
      phraseLabel: 'Aby usunąć wszystkie dane, wpisz: {phrase}',
      inputLabel: 'Wpisz frazę potwierdzającą',
      error: 'Nie udało się wyczyścić danych. Spróbuj ponownie.',
      actions: {
        cancel: 'Anuluj',
        confirm: 'Usuń wszystko',
        pending: 'Usuwanie...'
      }
    }
  },
  en: {
    reset: {
      title: 'Delete all app data',
      copy: 'This removes all members, trainings, payments, club/trainer setup, and app-owned local state stored on this device.',
      phraseLabel: 'To delete all data, type: {phrase}',
      inputLabel: 'Type the confirmation phrase',
      error: 'Data reset failed. Try again.',
      actions: {
        cancel: 'Cancel',
        confirm: 'Delete everything',
        pending: 'Deleting...'
      }
    }
  }
} as const

export type ResetDataModalLocale = keyof typeof RESET_DATA_MODAL_MESSAGES
