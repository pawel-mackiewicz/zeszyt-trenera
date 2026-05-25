import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { watch } from 'vue'
import { expect, within } from 'storybook/test'

import { useAppStore } from '@/ui/stores/app'

import { APP_SHELL_MESSAGES, type AppShellLocale } from './AppShell.messages'
import ShellStatusScreen from './ShellStatusScreen.vue'

type ShellStateScenario =
  | 'boot-checking'
  | 'setup-checking'
  | 'database-blocked'
  | 'bootstrap-blocked'

type ShellStatusScreenStoryArgs = {
  scenario: ShellStateScenario
}

function resolveStoryLocale(value: unknown): AppShellLocale {
  // What: coerce Storybook global locale to the app-shell dictionary keys. Why: play assertions should keep tracking translated copy without trusting toolbar globals blindly.
  return value === 'en' ? 'en' : 'pl'
}

function configureShellStatusScreenStoryState(
  args: ShellStatusScreenStoryArgs
) {
  const appStore = useAppStore()

  if (args.scenario === 'setup-checking') {
    appStore.setAppReady()
    appStore.setSetupStatus('checking')
    return
  }

  if (args.scenario === 'database-blocked') {
    appStore.blockApplication('database')
    return
  }

  if (args.scenario === 'bootstrap-blocked') {
    appStore.blockApplication('bootstrap')
    return
  }

  appStore.setSetupStatus('checking')
}

const meta: Meta<ShellStatusScreenStoryArgs> = {
  title: 'UI/AppShell/ShellStatusScreen',
  component: ShellStatusScreen,
  // What: model only valid shell states as story scenarios. Why: the production shell derives these combinations before this status screen renders, so Storybook should avoid impossible store snapshots.
  argTypes: {
    scenario: {
      control: { type: 'select' },
      options: [
        'boot-checking',
        'setup-checking',
        'database-blocked',
        'bootstrap-blocked'
      ] satisfies ShellStateScenario[]
    }
  },
  args: {
    scenario: 'boot-checking'
  },
  parameters: {
    layout: 'fullscreen'
  },
  render: (args) => ({
    components: { ShellStatusScreen },
    setup() {
      const pinia = createPinia()
      setActivePinia(pinia)
      configureShellStatusScreenStoryState(args)

      watch(
        () => args.scenario,
        () => configureShellStatusScreenStoryState(args)
      )
    },
    template: `
      <div class="app-canvas min-h-screen">
        <ShellStatusScreen />
      </div>
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const BootChecking: Story = {
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const messages = APP_SHELL_MESSAGES[locale].shellState.checking

    await expect(canvas.getByText(messages.eyebrow)).toBeInTheDocument()
    await expect(canvas.getByText(messages.title)).toBeInTheDocument()
  }
}

export const SetupChecking: Story = {
  args: {
    scenario: 'setup-checking'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const messages = APP_SHELL_MESSAGES[locale].shellState.setupChecking

    await expect(canvas.getByText(messages.eyebrow)).toBeInTheDocument()
    await expect(canvas.getByText(messages.title)).toBeInTheDocument()
  }
}

export const DatabaseBlocked: Story = {
  args: {
    scenario: 'database-blocked'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const shellStateMessages = APP_SHELL_MESSAGES[locale].shellState

    await expect(
      canvas.getByText(shellStateMessages.blocked.database)
    ).toBeInTheDocument()
    await expect(canvas.getByText(shellStateMessages.retry)).toBeInTheDocument()
  }
}

export const BootstrapBlocked: Story = {
  args: {
    scenario: 'bootstrap-blocked'
  },
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement)
    const locale = resolveStoryLocale(globals.locale)
    const shellStateMessages = APP_SHELL_MESSAGES[locale].shellState

    await expect(
      canvas.getByText(shellStateMessages.blocked.unknown)
    ).toBeInTheDocument()
    await expect(canvas.getByText(shellStateMessages.retry)).toBeInTheDocument()
  }
}
