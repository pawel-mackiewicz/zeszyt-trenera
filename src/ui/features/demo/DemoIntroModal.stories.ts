import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { useAppStore } from '@/ui/stores/app'

import DemoIntroModal from './DemoIntroModal.vue'
import { DemoIntroModalPath, useDemoStore } from './demo.store'

type DemoIntroModalStoryArgs = {
  modalVisible: boolean
  shellReady: boolean
}

const meta: Meta<DemoIntroModalStoryArgs> = {
  title: 'UI/DemoIntroModal',
  component: DemoIntroModal,
  // What: expose only the smart modal inputs that still exist at feature boundaries. Why: manual QA should exercise store/readiness behavior instead of a removed prop and emit API.
  argTypes: {
    modalVisible: {
      control: 'boolean'
    },
    shellReady: {
      control: 'boolean'
    }
  },
  args: {
    modalVisible: true,
    shellReady: true
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
        demoStore.showDemoIntroModal(DemoIntroModalPath.Startup)
      }
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
