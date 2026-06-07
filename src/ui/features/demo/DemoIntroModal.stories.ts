import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { provide } from 'vue'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { appServicesKey } from '@/ui/appServices'
import { useAppStore } from '@/ui/stores/app'

import DemoIntroModal from './DemoIntroModal.vue'
import {
  DEMO_INTRO_MODAL_MESSAGES,
  type DemoIntroModalLocale
} from './DemoIntroModal.messages'
import { useDemoStore } from './demo.store'

type DemoExitStoryResult = 'success' | 'pending' | 'failure'

type DemoIntroModalStoryArgs = {
  leaveResult: DemoExitStoryResult
  modalVisible: boolean
  shellReady: boolean
  onLeaveDemoMode: ReturnType<typeof fn>
}

function resolveStoryLocale(value: unknown): DemoIntroModalLocale {
  // What: coerce Storybook global locale to known app locales used in this story. Why: test assertions must stay deterministic even when toolbar globals are missing or malformed.
  return value === 'en' ? 'en' : 'pl'
}

function createLeaveDemoHandler(args: DemoIntroModalStoryArgs) {
  return async (command: Record<string, never>) => {
    args.onLeaveDemoMode(command)

    if (args.leaveResult === 'failure') {
      throw new Error('Storybook leave-demo failure')
    }

    if (args.leaveResult === 'pending') {
      await new Promise<void>(() => undefined)
    }
  }
}

const meta: Meta<DemoIntroModalStoryArgs> = {
  title: 'UI/DemoIntroModal',
  component: DemoIntroModal,
  // What: expose only the smart modal inputs that still exist at feature boundaries. Why: manual QA should exercise store/readiness/use-case behavior instead of the removed prop and emit API.
  argTypes: {
    leaveResult: {
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
    leaveResult: 'success',
    modalVisible: true,
    shellReady: true,
    onLeaveDemoMode: fn()
  },
  parameters: {
    layout: 'centered'
  },
  render: (args) => ({
    components: { DemoIntroModal },
    setup() {
      const pinia = createPinia()
      setActivePinia(pinia)
      const appStore = useAppStore()
      const demoStore = useDemoStore()

      if (args.shellReady) {
        appStore.setAppReady()
        appStore.setSetupStatus('ready')
      }

      demoStore.setDemoModeActive(true)

      if (args.modalVisible) {
        demoStore.showDemoIntroModal()
      }

      // What: provide a story-local application service seam. Why: the smart modal now calls the leave-demo use case, but Storybook should not touch real local-first data.
      provide(appServicesKey, {
        queries: {} as never,
        system: {
          demo: {
            leave: {
              handle: createLeaveDemoHandler(args)
            }
          }
        } as never,
        useCases: {} as never
      })
    },
    template: '<DemoIntroModal />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const StayAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the exploration CTA assertion isolated in its own story. Why: staying in demo should close only the local overlay without invoking the destructive exit workflow.
    await userEvent.click(canvas.getByTestId('continue-demo-button'))
    await waitFor(() =>
      expect(
        canvas.queryByTestId('continue-demo-button')
      ).not.toBeInTheDocument()
    )
  }
}

export const ConfirmAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the exit CTA assertion isolated in its own story. Why: the destructive transition to setup must prove it still enters the application workflow.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await waitFor(() => expect(args.onLeaveDemoMode).toHaveBeenCalledWith({}))
  }
}

export const BackdropCloseAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: test the backdrop close path separately from button clicks. Why: mobile users commonly dismiss overlays by tapping outside the card, and that contract should not regress.
    await userEvent.click(canvas.getByTestId('demo-intro-modal-backdrop'))
    await waitFor(() =>
      expect(
        canvas.queryByTestId('continue-demo-button')
      ).not.toBeInTheDocument()
    )
  }
}

export const Pending: Story = {
  args: {
    leaveResult: 'pending'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const pendingLabel = DEMO_INTRO_MODAL_MESSAGES[locale].demo.actions.pending

    // What: derive pending CTA copy from the same translation source as the component. Why: wording updates should not break this story while the pending-state contract remains enforced.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await expect(canvas.getByText(pendingLabel)).toBeInTheDocument()
    await expect(canvas.getByTestId('continue-demo-button')).toBeDisabled()
    await expect(canvas.getByTestId('confirm-leave-demo-button')).toBeDisabled()
  }
}

export const Failure: Story = {
  args: {
    leaveResult: 'failure'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)

    // What: keep failed leave-demo feedback visible in Storybook. Why: the feature-specific alert wrapper is the main UI evidence that smart modal errors still rise above the overlay.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await expect(
      await canvas.findByText(DEMO_INTRO_MODAL_MESSAGES[locale].demo.error)
    ).toBeInTheDocument()
  }
}
