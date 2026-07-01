<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import { DemoIntroModalPath, useDemoStore } from '@/ui/features/demo/demo.store'

const LEAVE_DEMO_BUTTON_MESSAGES = {
  pl: {
    demo: {
      actions: {
        open: 'Wyjdź z demo'
      }
    }
  },
  en: {
    demo: {
      actions: {
        open: 'Leave demo'
      }
    }
  }
} as const

const demoStore = useDemoStore()
const { demoModeActive } = storeToRefs(demoStore)
const { t } = useI18n({
  useScope: 'local',
  messages: LEAVE_DEMO_BUTTON_MESSAGES
})

function openDemoOutroModal() {
  // What: open the demo-exit modal through the feature store from the header CTA. Why: the smart feature modal listens to shared state without the app shell owning demo workflow details.
  demoStore.showDemoIntroModal(DemoIntroModalPath.Exit)
}
</script>

<template>
  <!-- What: wrap the demo exit control in the shared button primitive. Why: Header keeps the same tactile CTA language while demo orchestration stays inside the feature folder. -->
  <AppButton
    v-if="demoModeActive"
    class="leave-demo-button"
    data-testid="open-demo-modal"
    size="compact"
    type="button"
    variant="secondary"
    @click="openDemoOutroModal"
  >
    {{ t('demo.actions.open') }}
  </AppButton>
</template>

<style scoped>
.leave-demo-button {
  /* What: keep the demo header CTA on one line. */
  white-space: nowrap;
}
</style>
