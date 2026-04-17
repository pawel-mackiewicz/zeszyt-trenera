<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type MessageFunction, type VueMessageType } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import type { ManualInstallVariant } from '@/ui/composables/usePwaInstall'
import {
  InstallModalStatus,
  type InstallModalStatusValue
} from '@/ui/components/modals/install/InstallModal.contract'
import { INSTALL_MODAL_MESSAGES } from '@/ui/components/modals/install/InstallModal.messages'

type ManualInstallStepMessage = VueMessageType | MessageFunction<VueMessageType>

// What: keep the install modal as a presentational surface with event outputs only. Why: install workflow mutations stay in AppShell so store/composable side effects remain centralized in one orchestration layer.
const props = defineProps<{
  status: InstallModalStatusValue
  manualInstallVariant: ManualInstallVariant | null
}>()

const emit = defineEmits<{
  primary: []
  later: []
}>()

// What: inject install translations from a dedicated module instead of inline SFC JSON. Why: the same message source is reused by stories/specs so copy updates do not create duplicated brittle literals.
const { t, tm, rt } = useI18n({
  useScope: 'local',
  messages: INSTALL_MODAL_MESSAGES
})
const manualInstallTranslationKey = 'install.manual.iosSafari' as const

// What: derive UI behavior from one install status prop. Why: the modal should not infer visibility/manual/pending from separate booleans that can drift out of sync.
const isVisible = computed(() => props.status !== InstallModalStatus.Hidden)
const isManual = computed(() => props.status === InstallModalStatus.ManualReady)
const isPending = computed(
  () => props.status === InstallModalStatus.NativePending
)
const eyebrow = computed(() =>
  isManual.value ? t('install.manual.eyebrow') : t('install.native.eyebrow')
)
const title = computed(() =>
  isManual.value
    ? t(`${manualInstallTranslationKey}.title`)
    : t('install.native.title')
)
const body = computed(() =>
  isManual.value
    ? t(`${manualInstallTranslationKey}.body`)
    : t('install.native.body')
)
const primaryLabel = computed(() =>
  isManual.value
    ? t('actions.understand')
    : isPending.value
      ? t('install.native.pending')
      : t('install.native.primary')
)
const laterLabel = computed(() => t('actions.later'))
const manualInstallSteps = computed(() => {
  if (!isManual.value || props.manualInstallVariant === null) {
    return [] as ManualInstallStepMessage[]
  }

  // What: render only the supported manual-install recipe for the active browser flow. Why: iOS Safari is the only manual branch in the current PWA install strategy.
  // What: keep locale messages as i18n message values instead of forcing plain strings. Why: Storybook interaction tests can expose message nodes from tm(), and rendering with rt() guarantees human-readable copy in every runtime.
  return tm(
    `${manualInstallTranslationKey}.steps`
  ) as ManualInstallStepMessage[]
})

function emitPrimary() {
  emit('primary')
}

function emitLater() {
  emit('later')
}
</script>

<template>
  <Transition name="overlay-pop">
    <div
      v-if="isVisible"
      class="install-modal-layer fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
    >
      <div
        class="install-modal-layer__backdrop absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
        data-testid="install-modal-backdrop"
        @click="emitLater"
      ></div>
      <section class="install-modal-card relative w-full max-w-lg">
        <p class="install-modal-card__eyebrow">{{ eyebrow }}</p>
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
            :disabled="isPending"
            @click="emitPrimary"
          >
            {{ primaryLabel }}
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            data-testid="install-modal-later"
            @click="emitLater"
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

.install-modal-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
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
