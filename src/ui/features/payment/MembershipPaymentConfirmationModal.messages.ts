export type MembershipPaymentConfirmationModalLocale = 'pl' | 'en'

// What: keep payment-confirmation copy beside the extracted modal. Why: Storybook interaction stories and the component should assert against one shared message source instead of duplicating labels.
export const MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES = {
  pl: {
    confirmation: {
      title: 'Oznaczyć składkę jako opłaconą?',
      body: 'Czy odebrano płatność od {memberName} za {month}?',
      memberLabel: 'Członek',
      monthLabel: 'Miesiąc',
      ageLabel: 'Wiek',
      attendanceLabel: 'Obecności',
      attendanceValue: '{count} treningi w tym miesiącu',
      actions: {
        confirm: 'Potwierdź płatność',
        pending: 'Zapisywanie...',
        cancel: 'Anuluj'
      }
    }
  },
  en: {
    confirmation: {
      title: 'Mark membership as paid?',
      body: 'Have you received the payment from {memberName} for {month}?',
      memberLabel: 'Member',
      monthLabel: 'Month',
      ageLabel: 'Age',
      attendanceLabel: 'Attendance',
      attendanceValue: '{count} sessions in this month',
      actions: {
        confirm: 'Confirm payment',
        pending: 'Saving...',
        cancel: 'Cancel'
      }
    }
  }
} as const
