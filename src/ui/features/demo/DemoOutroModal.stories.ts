import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { provide } from 'vue'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { appServicesKey } from '@/ui/appServices'
import { useAppStore } from '@/ui/stores/app'

import DemoOutroModal from './DemoOutroModal.vue'
import { DemoIntroModalPath, useDemoStore } from './demo.store'

type DemoExitStoryResult = 'success' | 'pending' | 'failure'

type DemoOutroModalStoryArgs = {
  leaveResult: DemoExitStoryResult
  modalVisible: boolean
  shellReady: boolean
  onLeaveDemoMode: ReturnType<typeof fn>
}

function createLeaveDemoHandler(args: DemoOutroModalStoryArgs) {
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

const meta: Meta<DemoOutroModalStoryArgs> = {
  title: 'UI/DemoOutroModal',
  component: DemoOutroModal,
  // What: expose only the smart outro inputs that still exist at feature boundaries. Why: manual QA should exercise store/readiness/use-case behavior instead of prop-emitted modal wiring.
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
    components: { DemoOutroModal },
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
        demoStore.showDemoIntroModal(DemoIntroModalPath.Exit)
      }

      // What: provide a story-local application service seam. Why: the smart outro calls the leave-demo use case, but Storybook should not touch real local-first data.
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
    template: '<DemoOutroModal />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ConfirmAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the exit CTA assertion isolated in its own story. Why: the destructive transition to setup must prove it still enters the application workflow.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await waitFor(() => expect(args.onLeaveDemoMode).toHaveBeenCalledWith({}))
  }
}

export const Pending: Story = {
  args: {
    leaveResult: 'pending'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: check pending CTA copy through the visible button. Why: the local modal message now lives in the SFC instead of a shared story import.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await expect(
      canvas.getByTestId('confirm-leave-demo-button')
    ).toHaveTextContent(/Przechodzę do konfiguracji|Opening setup/)
    await expect(canvas.getByTestId('continue-demo-button')).toBeDisabled()
    await expect(canvas.getByTestId('confirm-leave-demo-button')).toBeDisabled()
  }
}

export const Failure: Story = {
  args: {
    leaveResult: 'failure'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep failed leave-demo feedback visible in Storybook. Why: the feature-specific alert wrapper is the main UI evidence that smart modal errors still rise above the overlay.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await expect(
      await canvas.findByText(
        /Nie udało się wyjść z trybu demo|Demo mode could not be cleared/
      )
    ).toBeInTheDocument()
  }
}
