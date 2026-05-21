import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref, watch } from 'vue'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import ResetDataModal from './ResetDataModal.vue'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from './ResetDataModal.contract'
import {
  RESET_DATA_MODAL_MESSAGES,
  type ResetDataModalLocale
} from './ResetDataModal.messages'

type ResetDataModalStoryArgs = {
  status: ResetDataModalStatusValue
  confirmationInput: string
  confirmationPhrase: string
  canConfirm: boolean
  onConfirm: ReturnType<typeof fn>
  onClose: ReturnType<typeof fn>
  onUpdateConfirmationInput: ReturnType<typeof fn>
}

function resolveStoryLocale(value: unknown): ResetDataModalLocale {
  // What: coerce Storybook global locale to supported locales in this story. Why: interaction assertions must stay deterministic even when toolbar globals are missing or malformed.
  return value === 'en' ? 'en' : 'pl'
}

const meta: Meta<ResetDataModalStoryArgs> = {
  title: 'UI/ResetDataModal',
  component: ResetDataModal,
  argTypes: {
    status: {
      control: { type: 'select' },
      options: Object.values(ResetDataModalStatus)
    }
  },
  args: {
    status: ResetDataModalStatus.Ready,
    confirmationInput: '',
    confirmationPhrase: 'DELETE ALL DATA',
    canConfirm: false,
    onConfirm: fn(),
    onClose: fn(),
    onUpdateConfirmationInput: fn()
  },
  parameters: {
    layout: 'centered'
  },
  render: (args) => ({
    components: { ResetDataModal },
    setup() {
      const storyStatus = ref(args.status)
      const componentProps = computed(() => ({
        status: storyStatus.value,
        confirmationInput: args.confirmationInput,
        confirmationPhrase: args.confirmationPhrase,
        canConfirm: args.canConfirm
      }))

      watch(
        () => args.status,
        (status) => {
          storyStatus.value = status
        }
      )

      function handleClose() {
        args.onClose()

        if (storyStatus.value === ResetDataModalStatus.Pending) {
          return
        }

        storyStatus.value = ResetDataModalStatus.Hidden
      }

      // What: split component props from story spies. Why: the component API is emit-based and stories need explicit handler wiring to validate event contracts.
      // What: model the shell as the modal parent in Storybook. Why: ResetDataModal only emits close, so the story must hide it to make backdrop dismissal visible during manual QA.
      return { args, componentProps, handleClose }
    },
    template:
      '<ResetDataModal v-bind="componentProps" @confirm="args.onConfirm" @close="handleClose" @update:confirmationInput="args.onUpdateConfirmationInput" />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  args: {
    canConfirm: true
  }
}

export const ConfirmAction: Story = {
  args: {
    canConfirm: true
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep destructive CTA assertion isolated in its own story. Why: this interaction is safety-critical and should fail independently from other modal events.
    await userEvent.click(canvas.getByTestId('confirm-reset-button'))
    await expect(args.onConfirm).toHaveBeenCalledTimes(1)
    await expect(args.onClose).toHaveBeenCalledTimes(0)
  }
}

export const BackdropCloseAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('reset-data-modal-backdrop'))
    await expect(args.onClose).toHaveBeenCalledTimes(1)
    await expect(args.onConfirm).toHaveBeenCalledTimes(0)
    await waitFor(() =>
      expect(
        canvas.queryByTestId('reset-data-modal-backdrop')
      ).not.toBeInTheDocument()
    )
  }
}

export const Pending: Story = {
  args: {
    status: ResetDataModalStatus.Pending,
    canConfirm: true
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const pendingLabel = RESET_DATA_MODAL_MESSAGES[locale].reset.actions.pending

    await expect(canvas.getByText(pendingLabel)).toBeInTheDocument()
    await expect(canvas.getByTestId('confirm-reset-button')).toBeDisabled()
  }
}

export const InputUpdateAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(
      canvas.getByTestId('reset-confirmation-input'),
      'DELETE ALL DATA'
    )

    await expect(args.onUpdateConfirmationInput).toHaveBeenCalled()
  }
}
