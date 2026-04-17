import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import { expect, fn, userEvent, within } from 'storybook/test'

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
  status: InstallModalStatusValue
  manualInstallVariant: 'iosSafari' | null
  onPrimary: ReturnType<typeof fn>
  onLater: ReturnType<typeof fn>
}

function resolveStoryLocale(value: unknown): InstallModalLocale {
  // What: coerce Storybook global locale to known app locales used in this story. Why: interaction checks must remain deterministic even when toolbar globals are missing or malformed.
  return value === 'en' ? 'en' : 'pl'
}

const meta: Meta<InstallModalStoryArgs> = {
  title: 'UI/InstallModal',
  component: InstallModal,
  argTypes: {
    status: {
      control: { type: 'select' },
      options: Object.values(InstallModalStatus)
    }
  },
  args: {
    status: InstallModalStatus.NativeReady,
    manualInstallVariant: null,
    onPrimary: fn(),
    onLater: fn()
  },
  parameters: {
    layout: 'centered'
  },
  render: (args) => ({
    components: { InstallModal },
    setup() {
      const componentProps = computed(() => ({
        status: args.status,
        manualInstallVariant: args.manualInstallVariant
      }))

      // What: split component props from test-only story handlers. Why: the real component API exposes emits, so stories need explicit event wiring to assert install CTA interactions.
      return { args, componentProps }
    },
    template:
      '<InstallModal v-bind="componentProps" @primary="args.onPrimary" @later="args.onLater" />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const NativeReady: Story = {
  args: {
    status: InstallModalStatus.NativeReady
  }
}

export const NativePrimaryAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the primary CTA assertion isolated in its own story. Why: one interaction per story makes failures point directly to the broken button path.
    await userEvent.click(canvas.getByTestId('install-modal-primary'))
    await expect(args.onPrimary).toHaveBeenCalledTimes(1)
    await expect(args.onLater).toHaveBeenCalledTimes(0)
  }
}

export const NativeLaterAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the secondary CTA assertion isolated in its own story. Why: explicit separation prevents cross-button side effects from hiding regressions.
    await userEvent.click(canvas.getByTestId('install-modal-later'))
    await expect(args.onLater).toHaveBeenCalledTimes(1)
    await expect(args.onPrimary).toHaveBeenCalledTimes(0)
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
    status: InstallModalStatus.ManualReady,
    manualInstallVariant: 'iosSafari'
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
