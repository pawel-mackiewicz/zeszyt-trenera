<script setup lang="ts">
import AppIcon from '@/ui/components/AppIcon.vue'
import { RouterLink } from '@/ui/router/runtime'

import { useBottomNavigation } from './useBottomNavigation'

const { items, visible } = useBottomNavigation()
</script>

<template>
  <!-- What: render the persistent PWA bottom navigation as its own smart shell chrome. Why: AppShell should keep layout ownership while this component owns route-aware tab state and copy. -->
  <nav
    v-if="visible"
    class="fixed bottom-0 left-0 z-40 flex h-20 w-full items-stretch justify-around border-t border-on-surface/10 bg-surface/90 pb-safe backdrop-blur-md"
    data-testid="bottom-navigation"
  >
    <RouterLink
      v-for="item in items"
      :key="item.id"
      :aria-current="item.active ? 'page' : undefined"
      class="flex w-full flex-col items-center justify-center border-x border-on-surface/10 px-4 py-1 transition-all"
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
