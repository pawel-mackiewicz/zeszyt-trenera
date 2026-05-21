<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import DemoFloatingErrorAlert from '@/ui/features/demo/DemoFloatingErrorAlert.vue'
import { DEMO_INTRO_MODAL_MESSAGES } from '@/ui/features/demo/DemoIntroModal.messages'
import { useDemoIntroModal } from '@/ui/features/demo/useDemoIntroModal'

// What: inject feature translations from a dedicated module instead of inline SFC JSON. Why: modal, alert, header CTA, stories, and specs need one demo copy source as the feature moves together.
const { t } = useI18n({
  useScope: 'local',
  messages: DEMO_INTRO_MODAL_MESSAGES
})

const {
  demoExitErrorVisible,
  isDemoIntroModalPending,
  isDemoIntroModalVisible,
  closeDemoIntroModal,
  dismissDemoExitError,
  leaveDemoMode
} = useDemoIntroModal()

const confirmLabel = computed(() =>
  isDemoIntroModalPending.value
    ? t('demo.actions.pending')
    : t('demo.actions.confirm')
)
</script>

<template>
  <BaseModal
    :visible="isDemoIntroModalVisible"
    :title="t('demo.title')"
    backdrop-test-id="demo-intro-modal-backdrop"
    stack="raised"
    @close="closeDemoIntroModal"
  >
    <p class="base-modal__copy">{{ t('demo.copy') }}</p>

    <template #actions>
      <AppButton
        variant="secondary"
        type="button"
        :disabled="isDemoIntroModalPending"
        data-testid="confirm-leave-demo-button"
        @click="leaveDemoMode"
      >
        {{ confirmLabel }}
      </AppButton>
      <AppButton
        type="button"
        data-testid="continue-demo-button"
        :disabled="isDemoIntroModalPending"
        @click="closeDemoIntroModal"
      >
        {{ t('demo.actions.stay') }}
      </AppButton>
    </template>
  </BaseModal>

  <!-- What: render demo-exit failures from the feature modal itself. Why: retry feedback has to stay colocated with the smart overlay that owns the application workflow. -->
  <DemoFloatingErrorAlert
    v-if="demoExitErrorVisible"
    :message="t('demo.error')"
    @dismiss="dismissDemoExitError"
  />
</template>
