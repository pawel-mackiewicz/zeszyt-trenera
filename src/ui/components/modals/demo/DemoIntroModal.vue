<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import {
  DemoIntroModalStatus,
  type DemoIntroModalStatusValue
} from '@/ui/components/modals/demo/DemoIntroModal.contract'
import { DEMO_INTRO_MODAL_MESSAGES } from '@/ui/components/modals/demo/DemoIntroModal.messages'

// What: keep the demo intro modal as a presentational shell surface with event outputs only. Why: demo-exit state mutations and use-case orchestration stay in AppShell so side effects remain centralized.
const props = defineProps<{
  status: DemoIntroModalStatusValue
}>()

const emit = defineEmits<{
  stay: []
  confirm: []
  close: []
}>()

// What: inject modal translations from a dedicated module instead of inline SFC JSON. Why: the same message source is reused by stories/specs so copy changes do not create duplicated brittle literals.
const { t } = useI18n({
  useScope: 'local',
  messages: DEMO_INTRO_MODAL_MESSAGES
})

// What: derive UI flags from one modal status prop. Why: one explicit state value avoids invalid active/pending combinations while keeping modal rendering logic declarative.
const isVisible = computed(() => props.status !== DemoIntroModalStatus.Hidden)
const isPending = computed(() => props.status === DemoIntroModalStatus.Pending)

const confirmLabel = computed(() =>
  isPending.value ? t('demo.actions.pending') : t('demo.actions.confirm')
)

function emitStay() {
  emit('stay')
}

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
      class="demo-intro-modal-layer fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4"
    >
      <div
        class="demo-intro-modal-layer__backdrop absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
        data-testid="demo-intro-modal-backdrop"
        @click="emitClose"
      ></div>
      <section class="demo-intro-modal-card relative w-full max-w-lg">
        <p class="demo-intro-modal-card__eyebrow">{{ t('demo.eyebrow') }}</p>
        <h2 class="demo-intro-modal-card__title">{{ t('demo.title') }}</h2>
        <!-- What: keep the demo welcome copy to one compact paragraph. Why: the first-run mobile modal should explain the seeded notebook without forcing coaches to read through a second block before they can explore it. -->
        <p class="demo-intro-modal-card__copy">{{ t('demo.copy') }}</p>
        <div class="demo-intro-modal-card__actions">
          <!-- What: make staying in demo the primary CTA. Why: the landing modal should default to exploration so coaches can inspect the seeded local notebook before committing to setup. -->
          <AppButton
            type="button"
            data-testid="continue-demo-button"
            :disabled="isPending"
            @click="emitStay"
          >
            {{ t('demo.actions.stay') }}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="isPending"
            data-testid="confirm-leave-demo-button"
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
.demo-intro-modal-card {
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 1.75rem);
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}

.demo-intro-modal-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.demo-intro-modal-card__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(1.6rem, 6vw, 2.3rem);
  line-height: 0.96;
  text-transform: uppercase;
  color: var(--color-primary);
}

.demo-intro-modal-card__copy {
  margin: 0;
  color: var(--color-on-surface);
  line-height: 1.5;
}

.demo-intro-modal-card__actions {
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
  .demo-intro-modal-card__actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
