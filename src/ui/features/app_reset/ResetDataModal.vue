<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from '@/ui/features/app_reset/ResetDataModal.contract'
import { RESET_DATA_MODAL_MESSAGES } from '@/ui/features/app_reset/ResetDataModal.messages'

// What: keep the reset modal as a presentational surface with event outputs only. Why: destructive write orchestration must stay in AppShell and the application layer callbacks.
const props = defineProps<{
  status: ResetDataModalStatusValue
  confirmationInput: string
  confirmationPhrase: string
  canConfirm: boolean
}>()

const emit = defineEmits<{
  'update:confirmationInput': [value: string]
  confirm: []
  close: []
}>()

// What: inject reset translations from a dedicated module instead of inline SFC JSON. Why: the same message source is reused by stories/specs so copy updates do not create duplicated brittle literals.
const { t } = useI18n({
  useScope: 'local',
  messages: RESET_DATA_MODAL_MESSAGES
})

// What: derive modal rendering flags from one status prop. Why: one explicit state avoids invalid visible/pending combinations in the UI layer.
const isVisible = computed(() => props.status !== ResetDataModalStatus.Hidden)
const isPending = computed(() => props.status === ResetDataModalStatus.Pending)
const confirmLabel = computed(() =>
  isPending.value ? t('reset.actions.pending') : t('reset.actions.confirm')
)
const confirmationInputModel = computed({
  get: () => props.confirmationInput,
  set: (value: string) => emit('update:confirmationInput', value)
})

function emitConfirm() {
  emit('confirm')
}

function emitClose() {
  emit('close')
}
</script>

<template>
  <BaseModal
    :visible="isVisible"
    :title="t('reset.title')"
    backdrop-test-id="reset-data-modal-backdrop"
    size="xl"
    @close="emitClose"
  >
    <!-- What: keep the destructive modal copy limited to the action, consequence, and phrase field. Why: mobile-first confirmation flows are easier to scan when duplicate helper lines do not push the required phrase below the fold. -->
    <p class="base-modal__copy">{{ t('reset.copy') }}</p>
    <!-- What: spell out the destructive consequence before the phrase. Why: destructive confirmations are safer when coaches read the outcome and required phrase in one sentence instead of seeing the token in isolation. -->
    <p class="base-modal__copy font-bold">
      {{ t('reset.phraseLabel', { phrase: confirmationPhrase }) }}
    </p>
    <input
      id="reset-confirmation"
      v-model="confirmationInputModel"
      class="w-full rounded-none border border-on-surface/20 bg-surface px-3 py-3 font-mono text-xs text-on-surface"
      type="text"
      autocomplete="off"
      :aria-label="t('reset.inputLabel')"
      data-testid="reset-confirmation-input"
    />

    <template #actions>
      <AppButton
        type="button"
        variant="secondary"
        :disabled="isPending"
        @click="emitClose"
      >
        {{ t('reset.actions.cancel') }}
      </AppButton>
      <AppButton
        type="button"
        :disabled="!canConfirm || isPending"
        data-testid="confirm-reset-button"
        @click="emitConfirm"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </BaseModal>
</template>
