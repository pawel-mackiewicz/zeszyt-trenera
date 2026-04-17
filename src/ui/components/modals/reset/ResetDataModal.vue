<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from '@/ui/components/modals/reset/ResetDataModal.contract'
import { RESET_DATA_MODAL_MESSAGES } from '@/ui/components/modals/reset/ResetDataModal.messages'

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
  <Transition name="overlay-pop">
    <div
      v-if="isVisible"
      class="reset-data-modal-layer fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
    >
      <div
        class="reset-data-modal-layer__backdrop absolute inset-0 bg-black/40"
        data-testid="reset-data-modal-backdrop"
        @click="emitClose"
      ></div>
      <section class="reset-data-modal-card relative w-full max-w-xl">
        <div class="reset-data-modal-card__content">
          <!-- What: keep the destructive modal copy limited to the action, consequence, and phrase field. Why: mobile-first confirmation flows are easier to scan when duplicate helper lines do not push the required phrase below the fold. -->
          <h2 class="reset-data-modal-card__title">{{ t('reset.title') }}</h2>
          <p class="reset-data-modal-card__copy">{{ t('reset.copy') }}</p>
          <!-- What: spell out the destructive consequence before the phrase. Why: destructive confirmations are safer when coaches read the outcome and required phrase in one sentence instead of seeing the token in isolation. -->
          <p class="reset-data-modal-card__copy font-bold">
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
        </div>
        <div class="reset-data-modal-card__actions">
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
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.reset-data-modal-card {
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 1.75rem);
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}

.reset-data-modal-card__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(1.6rem, 6vw, 2.3rem);
  line-height: 0.96;
  text-transform: uppercase;
  color: var(--color-primary);
}

.reset-data-modal-card__copy {
  margin: 0;
  color: var(--color-on-surface);
  line-height: 1.5;
}

.reset-data-modal-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.overlay-pop-enter-active,
.overlay-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.overlay-pop-enter-from,
.overlay-pop-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (min-width: 640px) {
  .reset-data-modal-card__actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
