export type MembershipPaymentDeleteConfirmationModalLocale = 'pl' | 'en'

// What: keep delete-confirmation copy beside the extracted modal. Why: paid-row correction has its own destructive wording while still reusing the shared confirmation shell.
export const MEMBERSHIP_PAYMENT_DELETE_CONFIRMATION_MODAL_MESSAGES = {
  pl: {
    deleteConfirmation: {
      title: 'Usunąć zapisaną płatność?',
      body: 'Czy usunąć płatność od {memberName} za {month}?',
      memberLabel: 'Członek',
      monthLabel: 'Miesiąc',
      ageLabel: 'Wiek',
      actions: {
        confirm: 'Usuń płatność',
        pending: 'Usuwanie...',
        cancel: 'Anuluj'
      }
    }
  },
  en: {
    deleteConfirmation: {
      title: 'Delete recorded payment?',
      body: 'Delete the payment from {memberName} for {month}?',
      memberLabel: 'Member',
      monthLabel: 'Month',
      ageLabel: 'Age',
      actions: {
        confirm: 'Delete payment',
        pending: 'Deleting...',
        cancel: 'Cancel'
      }
    }
  }
} as const
