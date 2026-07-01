<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import { useDemoIntroModal } from '@/ui/features/demo/useDemoIntroModal'

const DEMO_INTRO_MODAL_MESSAGES = {
  pl: {
    demo: {
      startup: {
        title: 'Tryb Demo',
        copy: 'Sprawdź zeszyt-trenera na testowych danych',
        actions: {
          stay: 'Sprawdzam!'
        }
      }
    }
  },
  en: {
    demo: {
      startup: {
        title: 'Demo Mode',
        copy: 'Check out Coach Notebook on sample data',
        actions: {
          stay: 'Checking it out!'
        }
      }
    }
  }
} as const

const { t } = useI18n({
  useScope: 'local',
  messages: DEMO_INTRO_MODAL_MESSAGES
})

const { isDemoIntroModalVisible, closeDemoIntroModal } = useDemoIntroModal()
</script>

<template>
  <BaseModal
    :visible="isDemoIntroModalVisible"
    :title="t('demo.startup.title')"
    backdrop-test-id="demo-intro-modal-backdrop"
    stack="raised"
    @close="closeDemoIntroModal"
  >
    <p class="base-modal__copy">{{ t('demo.startup.copy') }}</p>

    <template #actions>
      <AppButton
        type="button"
        data-testid="continue-demo-button"
        @click="closeDemoIntroModal"
      >
        {{ t('demo.startup.actions.stay') }}
      </AppButton>
    </template>
  </BaseModal>
</template>
