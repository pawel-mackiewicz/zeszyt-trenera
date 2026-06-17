<script setup lang="ts">
import { computed } from 'vue'

import { useRoute } from '@/ui/router/runtime'

import CampParticipantActionsSection from './components/CampParticipantActionsSection.vue'
import CampParticipantDetailsSection from './components/CampParticipantDetailsSection.vue'
import CampParticipantPaymentSection from './components/CampParticipantPaymentSection.vue'

const route = useRoute()
const campId = computed(() => getRouteParam(route.params.campId))
const participantId = computed(() => getRouteParam(route.params.participantId))

function getRouteParam(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}
</script>

<template>
  <main class="camp-participant-details-view">
    <CampParticipantDetailsSection
      :camp-id="campId"
      :participant-id="participantId"
    />
    <CampParticipantPaymentSection
      :camp-id="campId"
      :participant-id="participantId"
    />
    <CampParticipantActionsSection
      :camp-id="campId"
      :participant-id="participantId"
    />
  </main>
</template>

<style scoped>
.camp-participant-details-view {
  display: grid;
  gap: 1.5rem;
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1rem calc(6rem + env(safe-area-inset-bottom));
}

@media (min-width: 48rem) {
  .camp-participant-details-view {
    padding-inline: 2rem;
  }
}
</style>
