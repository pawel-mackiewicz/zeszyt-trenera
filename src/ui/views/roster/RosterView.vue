<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import MemberFilterSortSection from '@/ui/components/MemberFilterSortSection.vue'
import MemberCounter from './components/MemberCounter.vue'
import RosterMemberRow from './components/RosterMemberRow.vue'
import RosterTabs, { type RosterTabOption } from './components/RosterTabs.vue'
import { useRosterMemberFilters } from '@/ui/views/roster/useRosterMemberFilters'

const { queries } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })
const activeMembers = ref<MemberRosterListItem[]>([])
const archivedMembers = ref<MemberRosterListItem[]>([])
const isActiveMembersLoading = ref(true)
const isArchivedMembersLoading = ref(true)
const rosterTabs = ['active', 'archived'] as const
type RosterTab = (typeof rosterTabs)[number]
const selectedRosterTab = ref<RosterTab>('active')
const rosterTabOptions = computed<readonly RosterTabOption<RosterTab>[]>(() =>
  rosterTabs.map((tab) => ({
    label: t(`tabs.${tab}`),
    value: tab
  }))
)

const openMemberId = ref<string | null>(null)
const editError = ref('')
let activeMembersSubscription: { unsubscribe(): void } | null = null
let archivedMembersSubscription: { unsubscribe(): void } | null = null
const currentMembers = computed(() =>
  selectedRosterTab.value === 'active'
    ? activeMembers.value
    : archivedMembers.value
)
const isLoading = computed(() =>
  selectedRosterTab.value === 'active'
    ? isActiveMembersLoading.value
    : isArchivedMembersLoading.value
)
const {
  filteredMembers,
  maxAgeFilter,
  memberSortDirection,
  memberSortField,
  minAgeFilter,
  searchQuery
} = useRosterMemberFilters(currentMembers, locale)

function subscribeToActiveMembers() {
  isActiveMembersLoading.value = true
  // What: keep the active roster wired to its own live application read contract. Why: switching roster tabs should not tear down and reload the active member projection.
  activeMembersSubscription?.unsubscribe()
  activeMembersSubscription = queries.observeMembersForRoster
    .handle()
    .subscribe({
      next(members) {
        activeMembers.value = members
        isActiveMembersLoading.value = false
      },
      error(error) {
        console.error('Failed to load members', error)
        isActiveMembersLoading.value = false
      }
    })
}

function subscribeToArchivedMembers() {
  isArchivedMembersLoading.value = true
  // What: keep archived roster data loaded alongside active members. Why: tab changes should swap already-observed local-first projections instead of rebuilding one shared subscription.
  archivedMembersSubscription?.unsubscribe()
  archivedMembersSubscription = queries
    .observeArchivedMembersForRoster!.handle()
    .subscribe({
      next(members) {
        archivedMembers.value = members
        isArchivedMembersLoading.value = false
      },
      error(error) {
        console.error('Failed to load archived members', error)
        isArchivedMembersLoading.value = false
      }
    })
}

function toggleDetails(id: string) {
  openMemberId.value = openMemberId.value === id ? null : id
}

function dismissEditError() {
  // What: let roster editing clear the shared floating error card after it has been read. Why: the coach should be able to keep the member form open for corrections without a stale warning lingering at the top of the screen.
  editError.value = ''
}

function showEditError(message: string) {
  editError.value = message
}

function finishMemberEdit() {
  editError.value = ''
}

function finishMemberMutation(memberId: string) {
  if (openMemberId.value === memberId) {
    openMemberId.value = null
  }

  editError.value = ''
}

watch(selectedRosterTab, () => {
  // What: close expanded rows when changing roster scope. Why: active and archived tabs represent different local-first projections, so details from one ledger should not remain open in the other.
  openMemberId.value = null
  editError.value = ''
})

onMounted(() => {
  subscribeToActiveMembers()
  subscribeToArchivedMembers()
})

onBeforeUnmount(() => {
  activeMembersSubscription?.unsubscribe()
  archivedMembersSubscription?.unsubscribe()
  activeMembersSubscription = null
  archivedMembersSubscription = null
})
</script>

<template>
  <div class="h-full pb-12">
    <FloatingErrorAlert
      v-if="editError"
      :message="editError"
      top-offset="shell"
      @dismiss="dismissEditError"
    />

    <div class="members-list-view h-full">
      <header class="members-list-view__summary-heading">
        <h1 class="members-list-view__summary-title">
          {{ t(`summary.${selectedRosterTab}`) }}
        </h1>
      </header>

      <MemberCounter
        :displayed-count="filteredMembers.length"
        :displayed-label="t('summary.displayedMembers')"
        :total-count="currentMembers.length"
        :total-label="t('summary.totalMembers')"
      />

      <MemberFilterSortSection
        v-model:search-query="searchQuery"
        v-model:min-age-filter="minAgeFilter"
        v-model:max-age-filter="maxAgeFilter"
        v-model:member-sort-field="memberSortField"
        v-model:member-sort-direction="memberSortDirection"
        search-input-id="members-search"
        :search-label="t('search.label')"
        :search-placeholder="t('search.placeholder')"
      />

      <RosterTabs
        v-model="selectedRosterTab"
        :label="t('tabs.label')"
        :tabs="rosterTabOptions"
      />

      <!-- Member Ledger List -->
      <Transition name="roster-tab-ledger" mode="out-in">
        <div :key="selectedRosterTab" class="roster-tab-ledger space-y-0">
          <div
            v-if="isLoading"
            class="p-8 text-center font-mono text-secondary uppercase animate-pulse"
          >
            {{ t('states.loading') }}
          </div>
          <div
            v-if="!isLoading && filteredMembers.length === 0"
            class="p-8 text-center font-mono text-secondary uppercase"
          >
            {{ t('states.empty') }}
          </div>

          <RosterMemberRow
            v-for="member in filteredMembers"
            :key="member.id"
            :is-open="openMemberId === member.id"
            :member="member"
            :variant="selectedRosterTab"
            @archived="finishMemberMutation"
            @deleted="finishMemberMutation"
            @error="showEditError"
            @saved="finishMemberEdit"
            @toggle="toggleDetails"
            @unarchived="finishMemberMutation"
          />
        </div>
      </Transition>
    </div>

    <div
      class="members-list-view__action-fab app-floating-action"
      :class="{
        'members-list-view__action-fab--mobile-hidden': openMemberId !== null
      }"
    >
      <!-- What: keep the add-member trigger pinned to the viewport edge. Why: when the desktop roster leaves side rail space, the CTA should float outside the list instead of covering rows. -->
      <AppButton
        as="router-link"
        to="/members/new"
        :aria-label="t('actions.addMemberAria')"
        :title="t('actions.addMemberAria')"
      >
        {{ t('actions.addMember') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.members-list-view {
  /* What: reserve space for the floating add action above the shell navigation. Why: the member ledger is a long local-first PWA screen, so the last rows must stay readable and tappable while the CTA remains pinned. */
  padding-bottom: max(9rem, calc(5rem + env(safe-area-inset-bottom) + 5.5rem));
}

.members-list-view__summary-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
}

.members-list-view__summary-title {
  margin: 0;
  color: var(--color-on-surface);
  font-family: var(--font-headline);
  font-size: 1.625rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.members-list-view__action-fab--mobile-hidden {
  display: none;
}

.roster-tab-ledger-enter-active,
.roster-tab-ledger-leave-active {
  transition: opacity 240ms var(--ease-standard);
}

.roster-tab-ledger-enter-from,
.roster-tab-ledger-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .roster-tab-ledger-enter-active,
  .roster-tab-ledger-leave-active {
    transition: opacity 120ms ease;
  }
}

@media (min-width: 768px) {
  .members-list-view__action-fab--mobile-hidden {
    display: block;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "addMember": "+ DODAJ",
      "addMemberAria": "Dodaj członka"
    },
    "summary": {
      "active": "Aktywni członkowie",
      "archived": "Archiwum członków",
      "displayedMembers": "Widoczni",
      "totalMembers": "Razem"
    },
    "search": {
      "label": "Szukaj w rejestrze",
      "placeholder": "Wpisz imię i nazwisko"
    },
    "tabs": {
      "label": "Zakres rejestru",
      "active": "Aktywni",
      "archived": "Archiwum"
    },
    "states": {
      "loading": "Ładowanie członków...",
      "empty": "Brak zapisanych członków."
    }
  },
  "en": {
    "actions": {
      "addMember": "+ ADD",
      "addMemberAria": "Add member"
    },
    "summary": {
      "active": "Active members",
      "archived": "Archived members",
      "displayedMembers": "Displayed",
      "totalMembers": "Total"
    },
    "search": {
      "label": "Search the register",
      "placeholder": "Enter first and last name"
    },
    "tabs": {
      "label": "Roster scope",
      "active": "Active",
      "archived": "Archived"
    },
    "states": {
      "loading": "Loading members...",
      "empty": "No members have been saved yet."
    }
  }
}
</i18n>
