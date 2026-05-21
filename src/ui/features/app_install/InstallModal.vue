<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type MessageFunction, type VueMessageType } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import { INSTALL_MODAL_MESSAGES } from '@/ui/features/app_install/InstallModal.messages'
import { useInstallModal } from '@/ui/features/app_install/useInstallModal'

type ManualInstallStepMessage = VueMessageType | MessageFunction<VueMessageType>

// What: inject install translations from a dedicated module instead of inline SFC JSON. Why: the same message source is reused by stories/specs so copy updates do not create duplicated brittle literals.
const { t, tm, rt } = useI18n({
  useScope: 'local',
  messages: INSTALL_MODAL_MESSAGES
})
const manualInstallTranslationKey = 'install.manual.iosSafari' as const

const {
  isInstallModalManual,
  isInstallModalPending,
  isInstallModalVisible,
  manualInstallVariant,
  handleInstallPrimaryAction,
  handleInstallLater
} = useInstallModal()

const title = computed(() =>
  isInstallModalManual.value
    ? t(`${manualInstallTranslationKey}.title`)
    : t('install.native.title')
)
const body = computed(() =>
  isInstallModalManual.value
    ? t(`${manualInstallTranslationKey}.body`)
    : t('install.native.body')
)
const primaryLabel = computed(() =>
  isInstallModalManual.value
    ? t('actions.understand')
    : isInstallModalPending.value
      ? t('install.native.pending')
      : t('install.native.primary')
)
const laterLabel = computed(() => t('actions.later'))
const manualInstallSteps = computed(() => {
  if (!isInstallModalManual.value || manualInstallVariant.value === null) {
    return [] as ManualInstallStepMessage[]
  }

  // What: render only the supported manual-install recipe for the active browser flow. Why: iOS Safari is the only manual branch in the current PWA install strategy.
  // What: keep locale messages as i18n message values instead of forcing plain strings. Why: Storybook interaction tests can expose message nodes from tm(), and rendering with rt() guarantees human-readable copy in every runtime.
  return tm(
    `${manualInstallTranslationKey}.steps`
  ) as ManualInstallStepMessage[]
})
</script>

<template>
  <Transition name="overlay-pop">
    <div
      v-if="isInstallModalVisible"
      class="install-modal-layer fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
    >
      <div
        class="install-modal-layer__backdrop absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
        data-testid="install-modal-backdrop"
        @click="handleInstallLater"
      ></div>
      <section class="install-modal-card relative w-full max-w-lg">
        <h2 class="install-modal-card__title">{{ title }}</h2>
        <p class="install-modal-card__copy">{{ body }}</p>
        <ol
          v-if="manualInstallSteps.length > 0"
          class="install-modal-card__steps"
        >
          <li
            v-for="(step, index) in manualInstallSteps"
            :key="index"
            class="install-modal-card__step"
          >
            <!-- What: resolve i18n message values to text at render time. Why: manual install guidance must stay readable even when tm() returns message-node structures in Storybook/browser tests. -->
            {{ rt(step) }}
          </li>
        </ol>
        <div class="install-modal-card__actions">
          <AppButton
            type="button"
            data-testid="install-modal-primary"
            :disabled="isInstallModalPending"
            @click="handleInstallPrimaryAction"
          >
            {{ primaryLabel }}
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            data-testid="install-modal-later"
            @click="handleInstallLater"
          >
            {{ laterLabel }}
          </AppButton>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.install-modal-card {
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 1.75rem);
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}

.install-modal-card__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(1.6rem, 6vw, 2.3rem);
  line-height: 0.96;
  text-transform: uppercase;
  color: var(--color-primary);
}

.install-modal-card__copy {
  margin: 0;
  color: var(--color-on-surface);
  line-height: 1.5;
}

.install-modal-card__steps {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: install-step;
}

.install-modal-card__step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  color: var(--ink);
  line-height: 1.5;
}

.install-modal-card__step::before {
  counter-increment: install-step;
  content: counter(install-step);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  flex: 0 0 1.65rem;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface-container-low);
  color: var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
}

.install-modal-card__actions {
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
  .install-modal-card__actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
