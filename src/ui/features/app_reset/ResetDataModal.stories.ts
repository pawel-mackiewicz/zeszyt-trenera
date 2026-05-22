import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { provide } from 'vue'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { appServicesKey } from '@/ui/appServices'
import { useAppStore } from '@/ui/stores/app'

import {
  RESET_DATA_MODAL_MESSAGES,
  type ResetDataModalLocale
} from './ResetDataModal.messages'
import ResetDataModal from './ResetDataModal.vue'
import { useAppResetStore } from './app-reset.store'

type ResetStoryResult = 'success' | 'pending' | 'failure'

type ResetDataModalStoryArgs = {
  confirmationInput: string
  modalVisible: boolean
  resetResult: ResetStoryResult
  shellReady: boolean
  onResetApplicationData: ReturnType<typeof fn>
}

function resolveStoryLocale(value: unknown): ResetDataModalLocale {
  // What: coerce Storybook global locale to supported reset locales. Why: interaction assertions must stay deterministic when toolbar globals are absent.
  return value === 'en' ? 'en' : 'pl'
}

function createResetHandler(args: ResetDataModalStoryArgs) {
  return async (command: { confirmationPhrase: string }) => {
    args.onResetApplicationData(command)

    if (args.resetResult === 'failure') {
      throw new Error('Storybook reset failure')
    }

    if (args.resetResult === 'pending') {
      await new Promise<void>(() => undefined)
    }
  }
}

const meta: Meta<ResetDataModalStoryArgs> = {
  title: 'UI/ResetDataModal',
  component: ResetDataModal,
  // What: expose only smart reset workflow controls. Why: the modal no longer accepts rendering props, so manual QA should exercise store readiness and application-layer outcomes.
  argTypes: {
    resetResult: {
      control: { type: 'select' },
      options: ['success', 'pending', 'failure']
    },
    modalVisible: {
      control: 'boolean'
    },
    shellReady: {
      control: 'boolean'
    }
  },
  args: {
    confirmationInput: '',
    modalVisible: true,
    resetResult: 'success',
    shellReady: true,
    onResetApplicationData: fn()
  },
  parameters: {
    layout: 'centered'
  },
  render: (args) => ({
    components: {
      ResetDataModalStory: {
        components: { ResetDataModal },
        setup() {
          const pinia = createPinia()
          setActivePinia(pinia)
          const appStore = useAppStore()
          const appResetStore = useAppResetStore()

          if (args.shellReady) {
            appStore.setAppReady()
            appStore.setSetupStatus('ready')
          }

          if (args.modalVisible) {
            appResetStore.openResetModal()
          }

          if (args.confirmationInput) {
            appResetStore.setResetConfirmationInput(args.confirmationInput)
          }
        },
        template: '<ResetDataModal />'
      }
    },
    setup() {
      // What: provide a story-local application service seam. Why: reset stories must never touch the real local-first database while exercising the smart modal.
      provide(appServicesKey, {
        queries: {} as never,
        useCases: {
          resetApplicationData: {
            handle: createResetHandler(args)
          }
        } as never
      })
    },
    template: '<ResetDataModalStory />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  args: {
    confirmationInput: 'DELETE ALL DATA'
  }
}

export const ConfirmAction: Story = {
  args: {
    confirmationInput: 'DELETE ALL DATA',
    resetResult: 'pending'
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep destructive CTA assertion isolated without resolving the story use case. Why: the production reset path reloads the PWA after success, which would tear down Storybook before the interaction can report its assertion.
    await userEvent.click(canvas.getByTestId('confirm-reset-button'))
    await waitFor(() =>
      expect(args.onResetApplicationData).toHaveBeenCalledWith({
        confirmationPhrase: 'DELETE ALL DATA'
      })
    )
  }
}

export const BackdropCloseAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('reset-data-modal-backdrop'))
    await waitFor(() =>
      expect(
        canvas.queryByTestId('reset-data-modal-backdrop')
      ).not.toBeInTheDocument()
    )
  }
}

export const Pending: Story = {
  args: {
    confirmationInput: 'DELETE ALL DATA',
    resetResult: 'pending'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const pendingLabel = RESET_DATA_MODAL_MESSAGES[locale].reset.actions.pending

    await userEvent.click(canvas.getByTestId('confirm-reset-button'))
    await expect(canvas.getByText(pendingLabel)).toBeInTheDocument()
    await expect(canvas.getByTestId('confirm-reset-button')).toBeDisabled()
  }
}

export const Failure: Story = {
  args: {
    confirmationInput: 'DELETE ALL DATA',
    resetResult: 'failure'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)

    // What: keep failed reset feedback visible in Storybook. Why: the modal-scoped alert is the main UI evidence that destructive reset errors rise above the overlay.
    await userEvent.click(canvas.getByTestId('confirm-reset-button'))
    await expect(
      await canvas.findByText(RESET_DATA_MODAL_MESSAGES[locale].reset.error)
    ).toBeInTheDocument()
  }
}

export const InputUpdateAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(
      canvas.getByTestId('reset-confirmation-input'),
      'DELETE ALL DATA'
    )

    await expect(canvas.getByTestId('confirm-reset-button')).toBeEnabled()
  }
}
