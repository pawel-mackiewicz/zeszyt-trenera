import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import { expect, fn, userEvent, within } from 'storybook/test'

import InstallModal from './InstallModal.vue'

type InstallModalStoryArgs = {
  active: boolean
  surface: 'manual' | 'native'
  pending: boolean
  manualInstallVariant: 'iosSafari' | null
  onPrimary: ReturnType<typeof fn>
  onLater: ReturnType<typeof fn>
}

const meta: Meta<InstallModalStoryArgs> = {
  title: 'UI/InstallModal',
  component: InstallModal,
  args: {
    active: true,
    surface: 'native',
    pending: false,
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
        active: args.active,
        surface: args.surface,
        pending: args.pending,
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

export const NativeReady: Story = {}

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
    pending: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Instalowanie...')).toBeInTheDocument()
    await expect(canvas.getByTestId('install-modal-primary')).toBeDisabled()
  }
}

export const ManualIosSafari: Story = {
  args: {
    surface: 'manual',
    manualInstallVariant: 'iosSafari'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('Stuknij przycisk Udostępnij w Safari.')
    ).toBeInTheDocument()
    await expect(canvas.getAllByRole('listitem')).toHaveLength(2)
  }
}
