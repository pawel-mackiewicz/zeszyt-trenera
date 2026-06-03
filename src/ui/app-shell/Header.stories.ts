import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import { computed, provide, reactive, watch } from 'vue'
import { routeLocationKey, routerKey } from 'vue-router/dist/vue-router.mjs'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import type { AppRouteName } from '@/ui/router'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useAppStore } from '@/ui/stores/app'
import { useShellStore } from '@/ui/stores/shell.store'

import Header from './Header.vue'

type HeaderStoryArgs = {
  routeName: AppRouteName
  showBack: boolean
  backTo: string
  online: boolean
  demoModeActive: boolean
  onBack: ReturnType<typeof fn>
  onPush: ReturnType<typeof fn>
}

function configureHeaderStoryState(args: HeaderStoryArgs) {
  const appStore = useAppStore()
  const demoStore = useDemoStore()

  appStore.setOnlineStatus(args.online)
  demoStore.setDemoModeActive(args.demoModeActive)
}

const meta: Meta<HeaderStoryArgs> = {
  title: 'UI/AppShell/Header',
  component: Header,
  argTypes: {
    routeName: {
      control: { type: 'select' },
      options: [
        'members-list',
        'membership-payments',
        'add-member',
        'attendance-history',
        'attendance-record',
        'attendance-edit',
        'setup-club',
        'setup-trainer',
        'debug-indexeddb'
      ] satisfies AppRouteName[]
    },
    showBack: {
      control: 'boolean'
    },
    backTo: {
      control: 'text'
    },
    online: {
      control: 'boolean'
    },
    demoModeActive: {
      control: 'boolean'
    }
  },
  args: {
    routeName: 'members-list',
    showBack: false,
    backTo: '',
    online: true,
    demoModeActive: false,
    onBack: fn(),
    onPush: fn()
  },
  parameters: {
    layout: 'fullscreen'
  },
  render: (args) => ({
    components: { Header },
    setup() {
      const pinia = createPinia()
      setActivePinia(pinia)
      configureHeaderStoryState(args)

      const shellStore = useShellStore()
      const route = reactive({
        get name() {
          return args.routeName
        },
        get path() {
          return args.backTo || '/members'
        },
        get fullPath() {
          return args.backTo || '/members'
        },
        get meta() {
          return {
            showBack: args.showBack,
            backTo: args.backTo || undefined
          }
        }
      })
      const router = {
        push: args.onPush,
        back: args.onBack
      }

      // What: provide only the router surface Header consumes. Why: Storybook tests should exercise the smart header without mounting unrelated routes or local-first boot flows.
      provide(routeLocationKey, route as never)
      provide(routerKey, router as never)

      watch(
        () => [args.online, args.demoModeActive] as const,
        () => configureHeaderStoryState(args)
      )

      const sidebarStateLabel = computed(() =>
        shellStore.sidebarOpen ? 'open' : 'closed'
      )
      const demoModalStateLabel = computed(() =>
        useDemoStore().demoIntroModalVisible ? 'open' : 'closed'
      )

      return { sidebarStateLabel, demoModalStateLabel }
    },
    template: `
      <div style="min-height: 10rem; padding-top: 4rem; background: var(--color-background); color: var(--color-on-surface);">
        <Header />
        <!-- What: expose smart Header side effects as tiny story-only probes. Why: play tests need observable state without coupling Header production markup to test-only labels. -->
        <output data-testid="sidebar-state" style="position: absolute; left: -9999px;">{{ sidebarStateLabel }}</output>
        <output data-testid="demo-modal-state" style="position: absolute; left: -9999px;">{{ demoModalStateLabel }}</output>
      </div>
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const TopLevelMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Członkowie')).toBeInTheDocument()
    await expect(canvas.getByTestId('shell-menu-button')).toBeInTheDocument()
    await expect(
      canvas.queryByTestId('shell-back-button')
    ).not.toBeInTheDocument()
  }
}

export const MenuToggleAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // What: verify the hamburger writes to shared shell state. Why: SidebarMenu owns the menu UI, so this hidden probe is the story-level evidence that Header still opens it.
    await userEvent.click(canvas.getByTestId('shell-menu-button'))
    await waitFor(() =>
      expect(canvas.getByTestId('sidebar-state')).toHaveTextContent('open')
    )
  }
}

export const OfflineBadge: Story = {
  args: {
    online: false
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Offline')).toBeInTheDocument()
  }
}

export const BackTargetAction: Story = {
  args: {
    routeName: 'add-member',
    showBack: true,
    backTo: '/members'
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('shell-back-button'))
    await expect(args.onPush).toHaveBeenCalledWith('/members')
    await expect(args.onBack).not.toHaveBeenCalled()
  }
}

export const HistoryBackAction: Story = {
  args: {
    routeName: 'attendance-record',
    showBack: true
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('shell-back-button'))
    await expect(args.onBack).toHaveBeenCalledTimes(1)
    await expect(args.onPush).not.toHaveBeenCalled()
  }
}

export const DemoExitAction: Story = {
  args: {
    demoModeActive: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('open-demo-modal'))
    await waitFor(() =>
      expect(canvas.getByTestId('demo-modal-state')).toHaveTextContent('open')
    )
  }
}
