import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import { expect, fn, userEvent, within } from 'storybook/test'

import DemoIntroModal from './DemoIntroModal.vue'
import {
  DemoIntroModalStatus,
  type DemoIntroModalStatusValue
} from './DemoIntroModal.contract'
import {
  DEMO_INTRO_MODAL_MESSAGES,
  type DemoIntroModalLocale
} from './DemoIntroModal.messages'

type DemoIntroModalStoryArgs = {
  status: DemoIntroModalStatusValue
  onStay: ReturnType<typeof fn>
  onConfirm: ReturnType<typeof fn>
  onClose: ReturnType<typeof fn>
}

function resolveStoryLocale(value: unknown): DemoIntroModalLocale {
  // What: coerce Storybook global locale to known app locales used in this story. Why: test assertions must stay deterministic even when toolbar globals are missing or malformed.
  return value === 'en' ? 'en' : 'pl'
}

const meta: Meta<DemoIntroModalStoryArgs> = {
  title: 'UI/DemoIntroModal',
  component: DemoIntroModal,
  // What: expose modal status as an interactive select control in Storybook. Why: manual QA should be able to flip between hidden, ready, and pending states without editing source code.
  argTypes: {
    status: {
      control: { type: 'select' },
      options: Object.values(DemoIntroModalStatus)
    }
  },
  args: {
    status: DemoIntroModalStatus.Ready,
    onStay: fn(),
    onConfirm: fn(),
    onClose: fn()
  },
  parameters: {
    layout: 'centered'
  },
  render: (args) => ({
    components: { DemoIntroModal },
    setup() {
      const componentProps = computed(() => ({
        status: args.status
      }))

      // What: split component props from Storybook handler spies. Why: the component exposes emits only, so interaction tests must bind story callbacks explicitly to assert event contracts.
      return { args, componentProps }
    },
    template:
      '<DemoIntroModal v-bind="componentProps" @stay="args.onStay" @confirm="args.onConfirm" @close="args.onClose" />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const StayAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the exploration CTA assertion isolated in its own story. Why: a focused interaction makes regressions in the primary demo path immediately visible.
    await userEvent.click(canvas.getByTestId('continue-demo-button'))
    await expect(args.onStay).toHaveBeenCalledTimes(1)
    await expect(args.onConfirm).toHaveBeenCalledTimes(0)
    await expect(args.onClose).toHaveBeenCalledTimes(0)
  }
}

export const ConfirmAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: keep the exit CTA assertion isolated in its own story. Why: the destructive transition to setup must have a dedicated safety check independent from other actions.
    await userEvent.click(canvas.getByTestId('confirm-leave-demo-button'))
    await expect(args.onConfirm).toHaveBeenCalledTimes(1)
    await expect(args.onStay).toHaveBeenCalledTimes(0)
    await expect(args.onClose).toHaveBeenCalledTimes(0)
  }
}

export const BackdropCloseAction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // What: test the backdrop close path separately from button clicks. Why: mobile users commonly dismiss overlays by tapping outside the card, and that contract should not regress.
    await userEvent.click(canvas.getByTestId('demo-intro-modal-backdrop'))
    await expect(args.onClose).toHaveBeenCalledTimes(1)
    await expect(args.onStay).toHaveBeenCalledTimes(0)
    await expect(args.onConfirm).toHaveBeenCalledTimes(0)
  }
}

export const Pending: Story = {
  args: {
    status: DemoIntroModalStatus.Pending
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const pendingLabel = DEMO_INTRO_MODAL_MESSAGES[locale].demo.actions.pending

    // What: derive pending CTA copy from the same translation source as the component. Why: wording updates should not break this story while the pending-state contract remains enforced.
    await expect(canvas.getByText(pendingLabel)).toBeInTheDocument()
    await expect(canvas.getByTestId('continue-demo-button')).toBeDisabled()
    await expect(canvas.getByTestId('confirm-leave-demo-button')).toBeDisabled()
  }
}
