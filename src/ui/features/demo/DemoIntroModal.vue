<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
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
  <Transition name="overlay-pop">
    <div
      v-if="isDemoIntroModalVisible"
      class="demo-intro-modal-layer fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4"
    >
      <div
        class="demo-intro-modal-layer__backdrop absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
        data-testid="demo-intro-modal-backdrop"
        @click="closeDemoIntroModal"
      ></div>
      <section class="demo-intro-modal-card relative w-full max-w-lg">
        <h2 class="demo-intro-modal-card__title">{{ t('demo.title') }}</h2>
        <p class="demo-intro-modal-card__copy">{{ t('demo.copy') }}</p>
        <div class="demo-intro-modal-card__actions">
          <AppButton
            type="button"
            data-testid="continue-demo-button"
            :disabled="isDemoIntroModalPending"
            @click="closeDemoIntroModal"
          >
            {{ t('demo.actions.stay') }}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="isDemoIntroModalPending"
            data-testid="confirm-leave-demo-button"
            @click="leaveDemoMode"
          >
            {{ confirmLabel }}
          </AppButton>
        </div>
      </section>
    </div>
  </Transition>

  <!-- What: render demo-exit failures from the feature modal itself. Why: retry feedback has to stay colocated with the smart overlay that owns the application workflow. -->
  <DemoFloatingErrorAlert
    v-if="demoExitErrorVisible"
    :message="t('demo.error')"
    @dismiss="dismissDemoExitError"
  />
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
