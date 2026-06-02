<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import ArchivedMemberDetailsDrawer from '@/ui/features/roster/ArchivedMemberDetailsDrawer.vue'
import MemberDetailsDrawer from '@/ui/features/roster/MemberDetailsDrawer.vue'
import RosterFilterSection from '@/ui/features/roster/RosterFilterSection.vue'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  matchesAgeRange
} from '@/ui/utils/ageRange'
import {
  sortMembers,
  type MemberSortDirection,
  type MemberSortField
} from '@/ui/utils/memberSort'

const { queries } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })
const activeMembers = ref<MemberRosterListItem[]>([])
const archivedMembers = ref<MemberRosterListItem[]>([])
const isActiveMembersLoading = ref(true)
const isArchivedMembersLoading = ref(true)
const searchQuery = ref('')
const maxAgeFilter = ref(AGE_FILTER_MAX)
const minAgeFilter = ref(AGE_FILTER_MIN)
const memberSortField = ref<MemberSortField>('firstName')
const memberSortDirection = ref<MemberSortDirection>('asc')
const rosterTabs = ['active', 'archived'] as const
type RosterTab = (typeof rosterTabs)[number]
const selectedRosterTab = ref<RosterTab>('active')

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
const membersCountLabel = computed(() =>
  t('summary.memberCount', { count: currentMembers.value.length })
)

function formatMemberName(member: MemberRosterListItem): string {
  return `${member.firstName} ${member.lastName}`
}

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

const filteredMembers = computed(() => {
  const visibleMembers = currentMembers.value.filter((member) => {
    const fullName = formatMemberName(member).toLowerCase()
    const matchesSearch = fullName.includes(searchQuery.value.toLowerCase())
    const matchesAge = matchesAgeRange(
      member.dateOfBirth,
      minAgeFilter.value,
      maxAgeFilter.value
    )

    return matchesSearch && matchesAge
  })

  // What: pass visible members into the shared sorter instead of keeping comparator internals in the view. Why: this screen should keep local-first filtering concerns while reusable utilities own ordering rules.
  return sortMembers(visibleMembers, {
    field: memberSortField.value,
    direction: memberSortDirection.value,
    locale: locale.value
  })
})

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
  <div class="h-full pt-4 pb-12">
    <!-- What: surface roster edit failures through the shared floating error card. Why: member updates should announce recoverable write problems in the same top-level location as the rest of the app instead of only inside one expanded row. -->
    <FloatingErrorAlert
      v-if="editError"
      :message="editError"
      top-offset="shell"
      @dismiss="dismissEditError"
    />

    <!-- What: keep the floating alert and the roster list inside one shared root container. Why: this mobile-first members screen needs balanced template structure so Vue can compile the view and still pin the global error surface above the scrollable content. -->
    <div class="members-list-view h-full pt-4">
      <!-- Status Indicator / Stats -->
      <div class="mb-12">
        <div
          class="inline-block bg-primary text-white px-4 py-2 border border-on-surface hide-empty hard-shadow"
        >
          <span
            class="font-headline text-5xl font-black leading-none uppercase"
            >{{ membersCountLabel }}</span
          >
        </div>
      </div>

      <RosterFilterSection
        v-model:search-query="searchQuery"
        v-model:min-age-filter="minAgeFilter"
        v-model:max-age-filter="maxAgeFilter"
        v-model:member-sort-field="memberSortField"
        v-model:member-sort-direction="memberSortDirection"
      />

      <!-- Roster tabs -->
      <nav class="members-list-view__tabs" :aria-label="t('tabs.label')">
        <button
          v-for="tab in rosterTabs"
          :key="tab"
          class="members-list-view__tab"
          :class="{
            'members-list-view__tab--active': selectedRosterTab === tab
          }"
          type="button"
          :aria-pressed="selectedRosterTab === tab"
          @click="selectedRosterTab = tab"
        >
          {{ t(`tabs.${tab}`) }}
        </button>
      </nav>

      <!-- Member Ledger List -->
      <div class="space-y-0 border-t-2 border-on-surface">
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

        <details
          v-for="member in filteredMembers"
          :key="member.id"
          class="group"
          :open="openMemberId === member.id"
        >
          <!-- What: keep expand and collapse bound to the summary row only. Why: the details body contains edit actions and form fields that must remain tappable in this mobile-first list without collapsing on every interaction. -->
          <summary
            class="list-none cursor-pointer flex justify-between items-center p-4 bg-surface/40 hover:bg-surface-container-low transition-colors border-b border-outline-variant"
            @click.prevent="toggleDetails(member.id)"
          >
            <span class="flex flex-col">
              <span
                class="font-headline font-bold text-xl uppercase tracking-tight group-hover:text-primary transition-colors"
                >{{ member.firstName }} {{ member.lastName }}</span
              >
            </span>
            <AppIcon
              class="expand-icon transition-transform duration-200 text-secondary"
              :class="{ 'rotate-180': openMemberId === member.id }"
              name="expand_more"
            />
          </summary>
          <MemberDetailsDrawer
            v-if="selectedRosterTab === 'active'"
            :is-open="openMemberId === member.id"
            :member="member"
            @archived="finishMemberMutation"
            @deleted="finishMemberMutation"
            @error="showEditError"
            @saved="finishMemberEdit"
          />
          <ArchivedMemberDetailsDrawer
            v-else
            :is-open="openMemberId === member.id"
            :member="member"
            @error="showEditError"
            @unarchived="finishMemberMutation"
          />
        </details>
      </div>

      <div class="members-list-view__action-fab app-floating-action">
        <!-- What: keep the add-member trigger floating in the viewport corner instead of the filter stack. Why: this long-scrolling roster needs one always-available entry into member creation without sending coaches back to the top controls. -->
        <AppButton
          as="router-link"
          to="/member/new"
          :aria-label="t('actions.addMember')"
          :title="t('actions.addMember')"
          icon-only
        >
          <AppIcon name="add" />
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.members-list-view {
  /* What: reserve space for the floating add action above the shell navigation. Why: the member ledger is a long local-first PWA screen, so the last rows must stay readable and tappable while the CTA remains pinned. */
  padding-bottom: max(9rem, calc(5rem + env(safe-area-inset-bottom) + 5.5rem));
}

.members-list-view__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 2px solid var(--color-on-surface);
  border-bottom: 2px solid var(--color-on-surface);
  background: var(--color-surface);
}

.members-list-view__tab {
  min-height: 2.5rem;
  border-bottom: 3px solid transparent;
  border-left: 0;
  border-right: 1px solid var(--color-outline-variant);
  border-top: 0;
  background: transparent;
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.65rem 0.75rem 0.55rem;
  text-transform: uppercase;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background-color 160ms ease;
}

.members-list-view__tab:hover,
.members-list-view__tab:focus-visible {
  background: var(--color-surface-container-low);
  color: var(--color-on-surface);
}

.members-list-view__tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -4px;
}

.members-list-view__tab:last-child {
  border-right: 0;
}

.members-list-view__tab--active {
  border-bottom-color: var(--color-primary);
  color: var(--color-on-surface);
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "addMember": "Dodaj członka"
    },
    "summary": {
      "memberCount": "{count} członków"
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
      "addMember": "Add member"
    },
    "summary": {
      "memberCount": "{count} members"
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
