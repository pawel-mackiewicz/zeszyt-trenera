<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import CampListSection from '@/ui/views/camps/components/CampListSection.vue'
import { useCampList } from '@/ui/views/camps/useCampList'

const messages = {
  pl: {
    actions: {
      addCamp: 'Dodaj obóz',
      retry: 'Spróbuj ponownie'
    },
    sections: {
      present: 'Aktualne obozy',
      past: 'Zakończone obozy'
    },
    states: {
      emptyPresent: 'Brak aktualnych obozów',
      emptyPast: 'Brak zakończonych obozów',
      error: 'Nie udało się wczytać obozów.',
      loading: 'Wczytywanie obozów'
    }
  },
  en: {
    actions: {
      addCamp: 'Add camp',
      retry: 'Try again'
    },
    sections: {
      present: 'Current camps',
      past: 'Completed camps'
    },
    states: {
      emptyPresent: 'No current camps',
      emptyPast: 'No completed camps',
      error: 'Camps could not be loaded.',
      loading: 'Loading camps'
    }
  }
} as const

const { t } = useI18n({
  useScope: 'local',
  messages
})
const { clearError, isLoading, loadError, past, present, reload } =
  useCampList()
</script>

<template>
  <div class="camps-list-view">
    <FloatingErrorAlert
      v-if="loadError"
      :message="t('states.error')"
      top-offset="shell"
      @dismiss="clearError"
    />

    <div v-if="isLoading" class="camps-list-view__state">
      {{ t('states.loading') }}
    </div>
    <div v-else class="camps-list-view__ledger">
      <div v-if="loadError" class="camps-list-view__retry">
        <AppButton variant="secondary" @click="reload">
          {{ t('actions.retry') }}
        </AppButton>
      </div>

      <CampListSection
        :camps="present"
        :empty-message="t('states.emptyPresent')"
        :title="t('sections.present')"
        variant="present"
      />
      <CampListSection
        :camps="past"
        :empty-message="t('states.emptyPast')"
        :title="t('sections.past')"
        variant="past"
      />
    </div>

    <div class="camps-list-view__action app-floating-action">
      <AppButton
        as="router-link"
        to="/camps/new"
        :aria-label="t('actions.addCamp')"
        :title="t('actions.addCamp')"
      >
        {{ t('actions.addCamp') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.camps-list-view {
  min-height: 100%;
  padding: 2rem 1rem
    max(9rem, calc(5rem + env(safe-area-inset-bottom) + 5.5rem));
}

.camps-list-view__ledger {
  max-width: 64rem;
  margin: 0 auto;
}

.camps-list-view__state,
.camps-list-view__retry {
  max-width: 64rem;
  margin: 0 auto 1rem;
}

.camps-list-view__state {
  padding: 1.25rem 1rem;
  border-block: 1px solid var(--color-outline-variant);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-align: center;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.camps-list-view__retry {
  display: flex;
  justify-content: flex-start;
}

@media (min-width: 48rem) {
  .camps-list-view {
    padding-inline: 2rem;
  }
}
</style>
