<script setup lang="ts">
import { RouterView, useRoute } from '@/ui/router/runtime'

const route = useRoute()
</script>

<template>
  <!-- What: render the active route through the shared shell fade. Why: normal and setup shell phases need identical mobile-safe transitions without duplicating the fixed-position workaround. -->
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" :key="route.fullPath" />
    </Transition>
  </RouterView>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  /* What: keep route transitions on opacity only. Why: transforms create containing blocks that can briefly misplace fixed mobile actions and alerts during PWA route changes. */
  opacity: 0;
}
</style>
