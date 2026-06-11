<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import MemberFilterSortSection from '@/ui/components/MemberFilterSortSection.vue'
import { useRoute, useRouter } from '@/ui/router/runtime'
import CampParticipantCandidateRow from './components/CampParticipantCandidateRow.vue'
import {
  useCampParticipantCandidates,
  type CampParticipantCandidateViewItem
} from './useCampParticipantCandidates'

const messages = {
  pl: {
    actions: {
      add: 'Dodaj',
      addExternal: 'Dodaj spoza klubu',
      retry: 'Spróbuj ponownie',
      signedButton: 'Zapisany'
    },
    search: {
      label: 'Szukaj klubowicza',
      placeholder: 'Wpisz imię i nazwisko'
    },
    sections: {
      members: 'Lista klubowiczów'
    },
    states: {
      empty: 'Brak klubowiczów do wyświetlenia.',
      loading: 'Wczytywanie klubowiczów',
      loadError: 'Nie udało się wczytać klubowiczów z lokalnego zeszytu.',
      noMatches: 'Brak wyników dla tego filtra.'
    },
    table: {
      age: 'Wiek {age}',
      signed: 'Już zapisany'
    },
    title: 'Dodaj uczestnika obozu'
  },
  en: {
    actions: {
      add: 'Add',
      addExternal: 'Add outside club',
      retry: 'Try again',
      signedButton: 'Signed'
    },
    search: {
      label: 'Search club member',
      placeholder: 'Type first and last name'
    },
    sections: {
      members: 'Club members'
    },
    states: {
      empty: 'There are no club members to show.',
      loading: 'Loading club members',
      loadError: 'The local club member list could not be loaded.',
      noMatches: 'No members match this filter.'
    },
    table: {
      age: 'Age {age}',
      signed: 'Already signed'
    },
    title: 'Add camp participant'
  }
} as const

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n({
  useScope: 'local',
  messages
})
const campId = computed(() => {
  const param = route.params.campId

  return Array.isArray(param) ? param[0] : String(param ?? '')
})
const {
  filteredMemberCount,
  filteredMembers,
  isLoading,
  loadError,
  maxAgeFilter,
  memberSortDirection,
  memberSortField,
  minAgeFilter,
  reload,
  searchQuery,
  totalMemberCount
} = useCampParticipantCandidates({
  campId,
  locale
})
const emptyState = computed(() =>
  totalMemberCount.value === 0 ? t('states.empty') : t('states.noMatches')
)

function formatAge(age: number): string {
  return t('table.age', { age })
}

function selectMember(member: CampParticipantCandidateViewItem) {
  if (member.alreadySigned) {
    return
  }

  void router.push(
    `/camps/${encodeURIComponent(campId.value)}/participants/new/club/${encodeURIComponent(member.id)}`
  )
}
</script>

<template>
  <div class="camp-participant-list-view mx-auto max-w-4xl pt-4 pb-12">
    <section class="camp-participant-list-view__hero mb-6">
      <h2 class="camp-participant-list-view__title">{{ t('title') }}</h2>
    </section>

    <section
      v-if="loadError"
      class="camp-participant-list-view__state mb-10 px-5 py-6"
    >
      <p class="camp-participant-list-view__state-copy">
        {{ t('states.loadError') }}
      </p>
      <AppButton variant="secondary" type="button" @click="reload">
        {{ t('actions.retry') }}
      </AppButton>
    </section>

    <template v-else>
      <MemberFilterSortSection
        v-model:search-query="searchQuery"
        v-model:min-age-filter="minAgeFilter"
        v-model:max-age-filter="maxAgeFilter"
        v-model:member-sort-field="memberSortField"
        v-model:member-sort-direction="memberSortDirection"
        search-input-id="camp-participant-search"
        :search-label="t('search.label')"
        :search-placeholder="t('search.placeholder')"
      />

      <section class="mb-10">
        <div class="border-b border-outline-variant px-4 py-3">
          <div
            class="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
          >
            {{ t('sections.members') }}
          </div>
        </div>

        <div
          v-if="isLoading"
          class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
        >
          {{ t('states.loading') }}
        </div>

        <div
          v-else-if="filteredMemberCount === 0"
          class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
        >
          {{ emptyState }}
        </div>

        <ul v-else class="camp-participant-list-view__members">
          <CampParticipantCandidateRow
            v-for="member in filteredMembers"
            :key="member.id"
            :add-label="t('actions.add')"
            :format-age="formatAge"
            :member="member"
            :signed-button-label="t('actions.signedButton')"
            :signed-label="t('table.signed')"
            @select="selectMember"
          />
        </ul>
      </section>

      <div class="camp-participant-list-view__action app-floating-action">
        <AppButton disabled type="button">
          {{ t('actions.addExternal') }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.camp-participant-list-view {
  padding-bottom: max(8.5rem, calc(5rem + env(safe-area-inset-bottom) + 4rem));
}

.camp-participant-list-view__hero {
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-on-surface);
}

.camp-participant-list-view__title {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-headline);
  font-size: clamp(3rem, 11vw, 5.5rem);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-list-view__state {
  display: grid;
  gap: 1rem;
  justify-items: start;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(26, 28, 28, 0.92);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.camp-participant-list-view__state-copy {
  margin: 0;
}

.camp-participant-list-view__members {
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
