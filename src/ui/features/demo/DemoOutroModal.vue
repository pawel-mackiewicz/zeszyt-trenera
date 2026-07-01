<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import DemoFloatingErrorAlert from '@/ui/features/demo/DemoFloatingErrorAlert.vue'
import { useDemoOutroModal } from '@/ui/features/demo/useDemoOutroModal'

const DEMO_OUTRO_MODAL_MESSAGES = {
  pl: {
    demo: {
      exit: {
        title: 'Zaczynasz na serio?',
        copy: 'Jeśli demo już wystarczy, wyczyścimy testowe dane i przejdziesz do konfiguracji Twojego zeszytu.',
        actions: {
          confirm: 'Zaczynam na serio',
          pending: 'Przechodzę do konfiguracji...',
          stay: 'Jeszcze testuję'
        }
      },
      error: 'Nie udało się wyjść z trybu demo. Spróbuj ponownie.'
    }
  },
  en: {
    demo: {
      exit: {
        title: 'Ready to start for real?',
        copy: 'If the demo is enough, we will clear sample data and take you to setup your own notebook.',
        actions: {
          confirm: 'Start for real',
          pending: 'Opening setup...',
          stay: 'Keep testing'
        }
      },
      error: 'Demo mode could not be cleared. Try again.'
    }
  }
} as const

const { t } = useI18n({
  useScope: 'local',
  messages: DEMO_OUTRO_MODAL_MESSAGES
})

const {
  demoExitErrorVisible,
  isDemoOutroModalPending,
  isDemoOutroModalVisible,
  closeDemoOutroModal,
  dismissDemoExitError,
  leaveDemoMode
} = useDemoOutroModal()

const confirmLabel = computed(() =>
  isDemoOutroModalPending.value
    ? t('demo.exit.actions.pending')
    : t('demo.exit.actions.confirm')
)
</script>

<template>
  <BaseModal
    :visible="isDemoOutroModalVisible"
    :title="t('demo.exit.title')"
    backdrop-test-id="demo-outro-modal-backdrop"
    stack="raised"
    @close="closeDemoOutroModal"
  >
    <p class="base-modal__copy">{{ t('demo.exit.copy') }}</p>

    <template #actions>
      <AppButton
        type="button"
        :disabled="isDemoOutroModalPending"
        data-testid="confirm-leave-demo-button"
        @click="leaveDemoMode"
      >
        {{ confirmLabel }}
      </AppButton>
      <AppButton
        variant="secondary"
        type="button"
        data-testid="continue-demo-button"
        :disabled="isDemoOutroModalPending"
        @click="closeDemoOutroModal"
      >
        {{ t('demo.exit.actions.stay') }}
      </AppButton>
    </template>
  </BaseModal>

  <!-- What: render demo-exit failures from the outro modal itself. Why: retry feedback has to stay colocated with the smart overlay that owns the application workflow. -->
  <DemoFloatingErrorAlert
    v-if="demoExitErrorVisible"
    :message="t('demo.error')"
    @dismiss="dismissDemoExitError"
  />
</template>
