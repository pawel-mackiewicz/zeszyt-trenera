<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import { RESET_DATA_MODAL_MESSAGES } from '@/ui/features/app_reset/ResetDataModal.messages'
import { useAppReset } from '@/ui/features/app_reset/useAppReset'

// What: inject reset translations from a dedicated module instead of inline SFC JSON. Why: the same message source is reused by stories/specs so copy updates do not create duplicated brittle literals.
const { t } = useI18n({
  useScope: 'local',
  messages: RESET_DATA_MODAL_MESSAGES
})

const {
  isResetConfirmationValid,
  isResetModalPending,
  isResetModalVisible,
  resetConfirmationInputModel,
  resetConfirmationPhrase,
  resetErrorVisible,
  closeResetModal,
  confirmResetApplicationData,
  dismissResetError
} = useAppReset()

const confirmLabel = computed(() =>
  isResetModalPending.value
    ? t('reset.actions.pending')
    : t('reset.actions.confirm')
)
</script>

<template>
  <BaseModal
    :visible="isResetModalVisible"
    :title="t('reset.title')"
    backdrop-test-id="reset-data-modal-backdrop"
    size="xl"
    @close="closeResetModal"
  >
    <!-- What: keep the destructive modal copy limited to the action, consequence, and phrase field. Why: mobile-first confirmation flows are easier to scan when duplicate helper lines do not push the required phrase below the fold. -->
    <p class="base-modal__copy">{{ t('reset.copy') }}</p>
    <!-- What: spell out the destructive consequence before the phrase. Why: destructive confirmations are safer when coaches read the outcome and required phrase in one sentence instead of seeing the token in isolation. -->
    <p class="base-modal__copy font-bold">
      {{ t('reset.phraseLabel', { phrase: resetConfirmationPhrase }) }}
    </p>
    <input
      id="reset-confirmation"
      v-model="resetConfirmationInputModel"
      class="reset-data-modal__confirmation-input w-full rounded-none border border-on-surface/20 bg-surface px-3 py-3 font-mono text-on-surface"
      type="text"
      autocomplete="off"
      :aria-label="t('reset.inputLabel')"
      data-testid="reset-confirmation-input"
    />

    <template #actions>
      <AppButton
        type="button"
        variant="secondary"
        :disabled="isResetModalPending"
        @click="closeResetModal"
      >
        {{ t('reset.actions.cancel') }}
      </AppButton>
      <AppButton
        type="button"
        :disabled="!isResetConfirmationValid || isResetModalPending"
        data-testid="confirm-reset-button"
        @click="confirmResetApplicationData"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </BaseModal>

  <!-- What: render reset failures from the feature modal itself. Why: destructive local-data recovery feedback should stay with the smart workflow that owns confirmation and retry state. -->
  <FloatingErrorAlert
    v-if="resetErrorVisible"
    :message="t('reset.error')"
    stack-level="modal"
    top-offset="shell"
    @dismiss="dismissResetError"
  />
</template>

<style scoped>
.reset-data-modal__confirmation-input {
  font-size: var(--app-form-control-font-size);
}
</style>
