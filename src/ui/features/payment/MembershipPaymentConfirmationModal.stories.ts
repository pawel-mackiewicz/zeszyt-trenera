import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import MembershipPaymentConfirmationModal, {
  type MembershipPaymentConfirmationModalMember
} from './MembershipPaymentConfirmationModal.vue'
import {
  MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES,
  type MembershipPaymentConfirmationModalLocale
} from './MembershipPaymentConfirmationModal.messages'

type MembershipPaymentConfirmationModalStoryArgs = {
  confirmResult: 'success' | 'pending' | 'failure'
  errorMessage: string
  errorTitle: string
  isPending: boolean
  member: MembershipPaymentConfirmationModalMember
  visible: boolean
}

function resolveStoryLocale(
  value: unknown
): MembershipPaymentConfirmationModalLocale {
  // What: coerce Storybook globals to the component's locales. Why: play assertions should remain deterministic when the toolbar locale is absent or malformed.
  return value === 'en' ? 'en' : 'pl'
}

const defaultMember: MembershipPaymentConfirmationModalMember = {
  attendanceCount: 2,
  ageLabel: '59 lat',
  coveredMonthLabel: 'październik 2026',
  memberName: 'Royce Gracie'
}

const failureErrorTitle = 'Nie udało się zapisać płatności'
const failureErrorMessage =
  'Spróbuj ponownie. Ten ekran nie zapisał jeszcze zmiany.'

const meta: Meta<MembershipPaymentConfirmationModalStoryArgs> = {
  title: 'Features/Payment/MembershipPaymentConfirmationModal',
  component: MembershipPaymentConfirmationModal,
  // What: expose the modal as a pure presentation component in Storybook. Why: payment recording must stay behind the view/application layer while stories exercise only the reusable dialog contract.
  argTypes: {
    confirmResult: {
      control: { type: 'select' },
      options: ['success', 'pending', 'failure']
    },
    isPending: {
      control: 'boolean'
    },
    visible: {
      control: 'boolean'
    }
  },
  args: {
    confirmResult: 'success',
    errorMessage: '',
    errorTitle: '',
    isPending: false,
    member: defaultMember,
    visible: true
  },
  parameters: {
    layout: 'fullscreen'
  },
  render: (args) => ({
    components: { MembershipPaymentConfirmationModal },
    setup() {
      const visible = ref(args.visible)
      const isPending = ref(args.isPending)
      const errorMessage = ref(args.errorMessage)
      const errorTitle = ref(args.errorTitle)

      function closeModal() {
        if (isPending.value) {
          return
        }

        visible.value = false
      }

      async function confirmPayment() {
        if (isPending.value) {
          return
        }

        isPending.value = true

        if (args.confirmResult === 'pending') {
          return
        }

        if (args.confirmResult === 'failure') {
          // What: model the parent view's failed write state inside the story. Why: interaction tests should observe the modal staying open with a recoverable alert instead of only checking emitted events.
          errorTitle.value = failureErrorTitle
          errorMessage.value = failureErrorMessage
          isPending.value = false
          return
        }

        // What: close after the successful confirmation path in the story harness. Why: the Storybook test should behave like the real payments view after the application-layer write resolves.
        visible.value = false
        isPending.value = false
      }

      function dismissError() {
        errorTitle.value = ''
        errorMessage.value = ''
      }

      return {
        args,
        closeModal,
        confirmPayment,
        dismissError,
        errorMessage,
        errorTitle,
        isPending,
        visible
      }
    },
    template: `
      <MembershipPaymentConfirmationModal
        :visible="visible"
        :member="args.member"
        :is-pending="isPending"
        :error-message="errorMessage"
        :error-title="errorTitle"
        @close="closeModal"
        @confirm="confirmPayment"
        @dismiss-error="dismissError"
      />
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ConfirmAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('payment-confirmation-confirm'))
    await waitFor(() =>
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    )
  }
}

export const CancelAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('payment-confirmation-cancel'))
    await waitFor(() =>
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    )
  }
}

export const BackdropCloseAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: test the backdrop path separately from the cancel button. Why: mobile coaches can dismiss the confirmation by tapping outside the card, and that affordance should remain stable after extraction.
    await userEvent.click(canvas.getByTestId('payments-confirmation-backdrop'))
    await waitFor(() =>
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    )
  }
}

export const Pending: Story = {
  args: {
    confirmResult: 'pending'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const pendingLabel =
      MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES[locale].confirmation
        .actions.pending

    await userEvent.click(canvas.getByTestId('payment-confirmation-confirm'))
    await expect(canvas.getByText(pendingLabel)).toBeInTheDocument()
    await expect(
      canvas.getByTestId('payment-confirmation-confirm')
    ).toBeDisabled()
    await expect(
      canvas.getByTestId('payment-confirmation-cancel')
    ).toBeDisabled()
    await userEvent.click(canvas.getByTestId('payments-confirmation-backdrop'))
    await expect(canvas.getByRole('dialog')).toBeInTheDocument()
  }
}

export const FailureAction: Story = {
  args: {
    confirmResult: 'failure'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('payment-confirmation-confirm'))
    await expect(await canvas.findByRole('alert')).toBeInTheDocument()
    await expect(canvas.getByText(failureErrorMessage)).toBeInTheDocument()
    await expect(canvas.getByRole('dialog')).toBeInTheDocument()
  }
}

export const ErrorDismissAction: Story = {
  args: {
    errorMessage: failureErrorMessage,
    errorTitle: failureErrorTitle
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const alert = canvas.getByRole('alert')

    // What: click the shared alert's own dismiss control instead of asserting localized button copy. Why: this story verifies the modal event boundary, while FloatingErrorAlert owns its labels.
    await userEvent.click(within(alert).getByRole('button'))
    await waitFor(() =>
      expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
    )
  }
}
