<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppIcon from '@/ui/components/AppIcon.vue'
import {
  SHELL_BOTTOM_NAVIGATION_ITEMS,
  type ShellBottomNavigationItem
} from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import type { AppRouteName } from '@/ui/router'
import { RouterLink } from '@/ui/router/runtime'
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

function bottomNavStateClasses(isActive: boolean) {
  // What: force the selected bottom-nav tab to paint its own readable foreground. Why: relying on inherited text color made selected-state contrast too fragile for the mobile shell.
  return isActive ? activeBottomNavStateClasses : inactiveBottomNavStateClasses
}

function bottomNavForegroundClasses(isActive: boolean) {
  return isActive ? activeBottomNavForegroundClasses : ''
}
</script>

<template>
  <!-- What: render the persistent PWA bottom navigation as its own smart shell chrome. Why: AppShell should keep layout ownership while this component owns route-aware tab state and copy. -->
  <nav
    v-if="visible"
    class="fixed bottom-0 left-0 z-40 flex h-20 w-full items-stretch justify-around border-t border-on-surface/10 bg-surface/90 pb-safe backdrop-blur-md"
    data-testid="bottom-navigation"
  >
    <!-- What: animate only paint-level tab feedback. Why: desktop scrollbar reflows during route switches should not animate link dimensions and make the fixed PWA nav look shaky. -->
    <RouterLink
      v-for="item in items"
      :key="item.id"
      :aria-current="item.active ? 'page' : undefined"
      class="flex w-full flex-col items-center justify-center border-x border-on-surface/10 px-4 py-1 transition-colors"
      :class="item.stateClasses"
      :data-testid="`bottom-navigation-${item.id}`"
      :to="item.to"
    >
      <AppIcon :name="item.icon" :class="item.foregroundClasses" />
      <span
        class="mt-1 font-mono text-[10px] font-bold uppercase tracking-tighter"
        :class="item.foregroundClasses"
      >
        {{ item.label }}
      </span>
    </RouterLink>
  </nav>
</template>
