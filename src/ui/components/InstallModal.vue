<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type MessageFunction, type VueMessageType } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'

type InstallSurface = 'hidden' | 'manual' | 'native'
type ManualInstallVariant = 'iosSafari' | null
type ManualInstallStepMessage = VueMessageType | MessageFunction<VueMessageType>

// What: keep the install modal as a presentational surface with event outputs only. Why: install workflow mutations stay in AppShell so store/composable side effects remain centralized in one orchestration layer.
const props = defineProps<{
  active: boolean
  surface: InstallSurface
  pending: boolean
  manualInstallVariant: ManualInstallVariant
}>()

const emit = defineEmits<{
  primary: []
  later: []
}>()

const { t, tm, rt } = useI18n({ useScope: 'local' })
const manualInstallTranslationKey = 'install.manual.iosSafari' as const

const eyebrow = computed(() =>
  props.surface === 'manual'
    ? t('install.manual.eyebrow')
    : t('install.native.eyebrow')
)
const title = computed(() =>
  props.surface === 'manual'
    ? t(`${manualInstallTranslationKey}.title`)
    : t('install.native.title')
)
const body = computed(() =>
  props.surface === 'manual'
    ? t(`${manualInstallTranslationKey}.body`)
    : t('install.native.body')
)
const primaryLabel = computed(() =>
  props.surface === 'manual'
    ? t('actions.understand')
    : props.pending
      ? t('install.native.pending')
      : t('install.native.primary')
)
const laterLabel = computed(() => t('actions.later'))
const manualInstallSteps = computed(() => {
  if (props.surface !== 'manual' || props.manualInstallVariant === null) {
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
      v-if="active"
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
            :disabled="pending"
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

<i18n lang="json">
{
  "pl": {
    "actions": {
      "later": "Później",
      "understand": "Rozumiem"
    },
    "install": {
      "manual": {
        "eyebrow": "Instalacja ręczna",
        "iosSafari": {
          "title": "Dodaj do ekranu głównego",
          "body": "Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Na tej przeglądarce zrobisz to ręcznie, a poniżej masz krótkie kroki.",
          "steps": [
            "Stuknij przycisk Udostępnij w Safari.",
            "Wybierz Do ekranu głównego i potwierdź dodanie aplikacji."
          ]
        }
      },
      "native": {
        "eyebrow": "Instalacja PWA",
        "title": "Zainstaluj Zeszyt Trenera",
        "body": "Zainstaluj zeszyt-trenera dla najlepszych wrażeń. Dzięki temu otworzysz go jak lokalną aplikację i wygodniej wrócisz do niego offline.",
        "primary": "Zainstaluj Zeszyt Trenera",
        "pending": "Instalowanie..."
      }
    }
  },
  "en": {
    "actions": {
      "later": "Later",
      "understand": "Understood"
    },
    "install": {
      "manual": {
        "eyebrow": "Manual install",
        "iosSafari": {
          "title": "Add to Home Screen",
          "body": "Install Coach Notebook for the best experience. This browser needs the manual flow, and the short steps are below.",
          "steps": [
            "Tap the Share button in Safari.",
            "Choose Add to Home Screen and confirm the app."
          ]
        }
      },
      "native": {
        "eyebrow": "PWA install",
        "title": "Install Coach Notebook",
        "body": "Install Coach Notebook for the best experience. It will open like a local app and will be easier to return to offline.",
        "primary": "Install Coach Notebook",
        "pending": "Installing..."
      }
    }
  }
}
</i18n>
