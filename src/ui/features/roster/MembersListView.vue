<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import MembersSortTool from '@/ui/components/MembersSortTool.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import MemberDetailsDrawer from '@/ui/features/roster/MemberDetailsDrawer.vue'
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
const savedMembers = ref<MemberRosterListItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const maxAgeFilter = ref(AGE_FILTER_MAX)
const minAgeFilter = ref(AGE_FILTER_MIN)
const memberSortField = ref<MemberSortField>('firstName')
const memberSortDirection = ref<MemberSortDirection>('asc')

const openMemberId = ref<string | null>(null)
const editError = ref('')
let membersSubscription: { unsubscribe(): void } | null = null
const membersCountLabel = computed(() =>
  t('summary.memberCount', { count: savedMembers.value.length })
)

function formatMemberName(member: MemberRosterListItem): string {
  return `${member.firstName} ${member.lastName}`
}

function subscribeToSavedMembers() {
  isLoading.value = true
  // What: keep the roster list wired to the application read contract. Why: the members screen should refresh automatically when local writes change the roster instead of performing manual reloads.
  membersSubscription?.unsubscribe()
  membersSubscription = queries.observeMembersForRoster.handle().subscribe({
    next(members) {
      savedMembers.value = members
      isLoading.value = false
    },
    error(error) {
      console.error('Failed to load members', error)
      isLoading.value = false
    }
  })
}

const filteredMembers = computed(() => {
  const visibleMembers = savedMembers.value.filter((member) => {
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

function finishMemberDelete(memberId: string) {
  if (openMemberId.value === memberId) {
    openMemberId.value = null
  }

  editError.value = ''
}

onMounted(() => {
  subscribeToSavedMembers()
})

onBeforeUnmount(() => {
  membersSubscription?.unsubscribe()
  membersSubscription = null
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

      <!-- Utility Bar -->
      <section class="mb-12 border-b-2 border-on-surface pb-4">
        <!-- What: swap the local search markup for the shared roster search bar. Why: members should match the compact attendance affordance instead of maintaining its own divergent search treatment. -->
        <SearchBar
          v-model="searchQuery"
          input-id="members-search"
          :input-label="t('search.label')"
          :placeholder="t('search.placeholder')"
        />

        <!-- What: delegate the roster sorting UI to one shared component. Why: this keeps sort copy, toggle behavior, and mobile-first styling consistent with other reusable filter tools like AgeRangeFilter. -->
        <MembersSortTool
          v-model:sort-field="memberSortField"
          v-model:sort-direction="memberSortDirection"
        />
      </section>

      <!-- Additional filters -->
      <section class="mb-8 border-b-2 border-on-surface pb-6">
        <AgeRangeFilter
          v-model:min-value="minAgeFilter"
          v-model:max-value="maxAgeFilter"
          :max-bound="AGE_FILTER_MAX"
          :min-bound="AGE_FILTER_MIN"
        />
      </section>

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
            :is-open="openMemberId === member.id"
            :member="member"
            @deleted="finishMemberDelete"
            @error="showEditError"
            @saved="finishMemberEdit"
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
    "search": {
      "label": "Szukaj w rejestrze",
      "placeholder": "Wpisz imię i nazwisko"
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
    "search": {
      "label": "Search the register",
      "placeholder": "Enter first and last name"
    },
    "states": {
      "loading": "Loading members...",
      "empty": "No members have been saved yet."
    }
  }
}
</i18n>
