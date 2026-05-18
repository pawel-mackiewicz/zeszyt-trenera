import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { useAppStore } from '@/ui/stores/app'

import InstallModal from './InstallModal.vue'
import {
  InstallModalStatus,
  type InstallModalStatusValue
} from './InstallModal.contract'
import {
  INSTALL_MODAL_MESSAGES,
  type InstallModalLocale
} from './InstallModal.messages'

type InstallModalStoryArgs = {
  shellReady: boolean
  status: InstallModalStatusValue
}

function resolveStoryLocale(value: unknown): InstallModalLocale {
  // What: coerce Storybook global locale to known app locales used in this story. Why: interaction checks must remain deterministic even when toolbar globals are missing or malformed.
  return value === 'en' ? 'en' : 'pl'
}

function configureInstallStoryState(args: InstallModalStoryArgs) {
  const appStore = useAppStore()

  if (args.shellReady) {
    appStore.setAppReady()
    appStore.setSetupStatus('ready')
  }

  if (args.status === InstallModalStatus.Hidden) {
    appStore.setInstallSurface('hidden')
    return
  }

  appStore.setInstallSurface(
    args.status === InstallModalStatus.ManualReady ? 'manual' : 'native'
  )

  if (args.status === InstallModalStatus.NativePending) {
    appStore.setInstallPending(true)
  }

  appStore.openInstallModal()
}

const meta: Meta<InstallModalStoryArgs> = {
  title: 'UI/InstallModal',
  component: InstallModal,
  // What: expose store-shaped state instead of removed props. Why: Storybook should exercise the smart install feature boundary the same way AppShell mounts it.
  argTypes: {
    shellReady: {
      control: 'boolean'
    },
    status: {
      control: { type: 'select' },
      options: Object.values(InstallModalStatus)
    }
  },
  args: {
    shellReady: true,
    status: InstallModalStatus.NativeReady
  },
  parameters: {
    layout: 'centered'
  },
  render: (args) => ({
    components: { InstallModal },
    setup() {
      const pinia = createPinia()
      setActivePinia(pinia)
      configureInstallStoryState(args)
    },
    template: '<InstallModal />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const NativeReady: Story = {
  args: {
    status: InstallModalStatus.NativeReady
  }
}

export const ManualPrimaryAction: Story = {
  args: {
    status: InstallModalStatus.ManualReady
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: assert the smart manual CTA closes through feature state. Why: the component no longer emits events, so the visible overlay is the user-facing contract.
    await userEvent.click(canvas.getByTestId('install-modal-primary'))
    await waitFor(() =>
      expect(
        canvas.queryByTestId('install-modal-primary')
      ).not.toBeInTheDocument()
    )
  }
}

export const NativeLaterAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the secondary CTA assertion isolated in its own story. Why: mobile users need a reliable defer path even after install logic moved into the feature.
    await userEvent.click(canvas.getByTestId('install-modal-later'))
    await waitFor(() =>
      expect(
        canvas.queryByTestId('install-modal-later')
      ).not.toBeInTheDocument()
    )
  }
}

export const NativePending: Story = {
  args: {
    status: InstallModalStatus.NativePending
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const pendingLabel = INSTALL_MODAL_MESSAGES[locale].install.native.pending

    await expect(canvas.getByText(pendingLabel)).toBeInTheDocument()
    await expect(canvas.getByTestId('install-modal-primary')).toBeDisabled()
  }
}

export const ManualIosSafari: Story = {
  args: {
    status: InstallModalStatus.ManualReady
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const firstManualStep =
      INSTALL_MODAL_MESSAGES[locale].install.manual.iosSafari.steps[0]

    await expect(canvas.getByText(firstManualStep)).toBeInTheDocument()
    await expect(canvas.getAllByRole('listitem')).toHaveLength(2)
  }
}
