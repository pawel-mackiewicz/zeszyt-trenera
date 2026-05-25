<script setup lang="ts">
import RouteTransition from '@/ui/components/app-shell/RouteTransition.vue'
</script>

<template>
  <section
    class="min-h-screen px-6 py-10 sm:py-12 flex items-center justify-center"
  >
    <!-- What: render first-run setup outside the normal shell chrome. Why: required local club and trainer identity should stay focused and unskippable until setup navigation marks the notebook ready. -->
    <div class="w-full flex justify-center">
      <RouteTransition />
    </div>
  </section>
</template>
