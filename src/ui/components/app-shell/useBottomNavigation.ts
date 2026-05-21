import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  SHELL_BOTTOM_NAVIGATION_ITEMS,
  type ShellBottomNavigationItem
} from '@/ui/components/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/components/app-shell/AppShell.messages'
import type { AppRouteName } from '@/ui/router'
import { useRoute } from '@/ui/router/runtime'

type BottomNavigationItem = ShellBottomNavigationItem & {
  active: boolean
  foregroundClasses: string
  label: string
  stateClasses: string
}

const activeBottomNavStateClasses = 'bg-primary text-white'
const inactiveBottomNavStateClasses =
  'text-on-surface hover:bg-surface-container-low'
const activeBottomNavForegroundClasses = 'text-white'

export function useBottomNavigation() {
  const route = useRoute()
  const { t } = useI18n({
    useScope: 'local',
    messages: APP_SHELL_MESSAGES
  })

  const currentRouteName = computed(() => {
    return typeof route.name === 'string' ? (route.name as AppRouteName) : null
  })
  // What: let route metadata hide persistent navigation from detail and setup screens. Why: AppShell should not need to know bottom-nav rendering rules after the extraction.
  const visible = computed(() => !route.meta.hideBottomNav)
  const items = computed<BottomNavigationItem[]>(() =>
    SHELL_BOTTOM_NAVIGATION_ITEMS.map((item) => {
      const active = currentRouteName.value
        ? item.activeRouteNames.includes(currentRouteName.value)
        : false

      return {
        ...item,
        active,
        foregroundClasses: bottomNavForegroundClasses(active),
        label: t(item.labelKey),
        stateClasses: bottomNavStateClasses(active)
      }
    })
  )

  return {
    items,
    visible
  }
}

function bottomNavStateClasses(isActive: boolean) {
  // What: force the selected bottom-nav tab to paint its own readable foreground. Why: relying on inherited text color made selected-state contrast too fragile for the mobile shell.
  return isActive ? activeBottomNavStateClasses : inactiveBottomNavStateClasses
}

function bottomNavForegroundClasses(isActive: boolean) {
  return isActive ? activeBottomNavForegroundClasses : ''
}
