export type MembershipPaymentConfirmationModalLocale = 'pl' | 'en'

// What: keep payment-confirmation copy beside the extracted modal. Why: Storybook interaction stories and the component should assert against one shared message source instead of duplicating labels.
export const MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES = {
  pl: {
    confirmation: {
      title: 'Przyjmij Płatność',
      memberLabel: 'Członek',
      monthLabel: 'Miesiąc',
      ageLabel: 'Wiek',
      chargedAmountLabel: 'Kwota',
      chargedAmountPlaceholder: 'np. 160,00',
      chargedAmountSuffix: 'PLN',
      attendanceLabel: 'Obecności',
      attendanceValue: '{count} treningi w tym miesiącu',
      errors: {
        chargedAmountRequired: 'Wpisz kwotę płatności.',
        chargedAmountInvalid: 'Wpisz kwotę w złotówkach, na przykład 160,00.'
      },
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
      memberLabel: 'Member',
      monthLabel: 'Month',
      ageLabel: 'Age',
      chargedAmountLabel: 'Charged amount',
      chargedAmountPlaceholder: 'e.g. 160.00',
      chargedAmountSuffix: 'PLN',
      attendanceLabel: 'Attendance',
      attendanceValue: '{count} sessions in this month',
      errors: {
        chargedAmountRequired: 'Enter the payment amount.',
        chargedAmountInvalid: 'Enter the amount in PLN, for example 160.00.'
      },
      actions: {
        confirm: 'Confirm payment',
        pending: 'Saving...',
        cancel: 'Cancel'
      }
    }
  }
} as const
