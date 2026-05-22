<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, type MessageFunction, type VueMessageType } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import { INSTALL_MODAL_MESSAGES } from '@/ui/features/app_install/InstallModal.messages'
import { useAppInstall } from '@/ui/features/app_install/useAppInstall'

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
} = useAppInstall()

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
  <BaseModal
    :visible="isInstallModalVisible"
    :title="title"
    backdrop-test-id="install-modal-backdrop"
    @close="handleInstallLater"
  >
    <p class="base-modal__copy">{{ body }}</p>
    <ol v-if="manualInstallSteps.length > 0" class="install-modal__steps">
      <li
        v-for="(step, index) in manualInstallSteps"
        :key="index"
        class="install-modal__step"
      >
        <!-- What: resolve i18n message values to text at render time. Why: manual install guidance must stay readable even when tm() returns message-node structures in Storybook/browser tests. -->
        {{ rt(step) }}
      </li>
    </ol>

    <template #actions>
      <!-- What: put the dismiss action first in the DOM. Why: on the mobile-first stacked layout, the safer "later" choice should read before the install action. -->
      <!-- What: keep the install action second so the visual order matches the reversed placement request across both stacked and row layouts. Why: the modal should surface the low-risk escape route before the commitment action. -->
      <AppButton
        variant="secondary"
        type="button"
        data-testid="install-modal-later"
        @click="handleInstallLater"
      >
        {{ laterLabel }}
      </AppButton>
      <AppButton
        type="button"
        data-testid="install-modal-primary"
        :disabled="isInstallModalPending"
        @click="handleInstallPrimaryAction"
      >
        {{ primaryLabel }}
      </AppButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.install-modal__steps {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: install-step;
}

.install-modal__step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  color: var(--ink);
  line-height: 1.5;
}

.install-modal__step::before {
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
</style>
