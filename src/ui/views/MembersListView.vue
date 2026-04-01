<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { db } from '@/db'
import type { PersistedMember } from '@/infra'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import { useRouter } from '@/ui/router/runtime'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  matchesAgeRange
} from '@/ui/utils/ageRange'

const router = useRouter()
const { t } = useI18n({ useScope: 'local' })
const savedMembers = ref<PersistedMember[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const maxAgeFilter = ref(AGE_FILTER_MAX)
const minAgeFilter = ref(AGE_FILTER_MIN)

const openMemberId = ref<string | null>(null)
const membersCountLabel = computed(() =>
  t('summary.memberCount', { count: savedMembers.value.length })
)

async function loadSavedMembers() {
  isLoading.value = true
  try {
    await db.open()
    const members = await db.members.toArray()
    // Sort logic could simply be by createdAt desc initially
    savedMembers.value = members.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  } catch (error) {
    console.error('Failed to load members', error)
  } finally {
    isLoading.value = false
  }
}

const filteredMembers = computed(() => {
  return savedMembers.value.filter((m) => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchQuery.value.toLowerCase())
    const matchesAge = matchesAgeRange(
      m.dateOfBirth,
      minAgeFilter.value,
      maxAgeFilter.value
    )

    return matchesSearch && matchesAge
  })
})

function formatDisplayDate(val: Date | string | undefined): string {
  if (!val) return t('details.missing')
  const date = val instanceof Date ? val : new Date(val)
  return date.toISOString().split('T')[0]
}

function toggleDetails(id: string) {
  openMemberId.value = openMemberId.value === id ? null : id
}

function goToAddMember() {
  router.push('/add-member')
}

onMounted(() => {
  void loadSavedMembers()
})
</script>

<template>
  <div class="h-full pt-4 pb-12">
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
    <section
      class="mb-12 grid grid-cols-1 md:grid-cols-12 gap-0 border-b-2 border-on-surface pb-4 items-end"
    >
      <div class="md:col-span-11">
        <!-- What: swap the local search markup for the shared roster search bar. Why: members should match the compact attendance affordance instead of maintaining its own divergent search treatment. -->
        <SearchBar
          v-model="searchQuery"
          input-id="members-search"
          :input-label="t('search.label')"
          :placeholder="t('search.placeholder')"
        />
      </div>
      <div class="md:col-span-1 flex justify-end mt-4 md:mt-0">
        <button
          class="bg-primary hover:bg-surface-tint text-white w-12 h-12 flex items-center justify-center border border-on-surface hard-shadow transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:scale-95"
          @click="goToAddMember"
        >
          <AppIcon name="add" />
        </button>
      </div>
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
        @click.prevent="toggleDetails(member.id)"
      >
        <summary
          class="list-none cursor-pointer flex justify-between items-center p-4 bg-surface/40 hover:bg-surface-container-low transition-colors border-b border-outline-variant"
        >
          <div class="flex flex-col">
            <span
              class="font-headline font-bold text-xl uppercase tracking-tight group-hover:text-primary transition-colors"
              >{{ member.firstName }} {{ member.lastName }}</span
            >
          </div>
          <AppIcon
            class="expand-icon transition-transform duration-200 text-secondary"
            :class="{ 'rotate-180': openMemberId === member.id }"
            name="expand_more"
          />
        </summary>
        <div
          v-show="openMemberId === member.id"
          class="p-4 bg-white/60 backdrop-blur-sm border-b border-outline-variant grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div class="flex flex-col">
            <span
              class="font-label text-[0.6rem] text-secondary uppercase font-bold"
              >{{ t('details.phoneNumber') }}</span
            >
            <span class="font-mono text-sm font-medium">{{
              member.phoneNumber
            }}</span>
          </div>
          <div class="flex flex-col">
            <span
              class="font-label text-[0.6rem] text-secondary uppercase font-bold"
              >{{ t('details.dateOfBirth') }}</span
            >
            <span class="font-mono text-sm">{{
              formatDisplayDate(member.dateOfBirth)
            }}</span>
          </div>
          <div class="flex flex-col">
            <span
              class="font-label text-[0.6rem] text-secondary uppercase font-bold"
              >{{ t('details.joinedAt') }}</span
            >
            <span class="font-mono text-sm">{{
              formatDisplayDate(member.joinedAt)
            }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<i18n lang="json">
{
  "pl": {
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
    },
    "details": {
      "phoneNumber": "Telefon",
      "dateOfBirth": "Data ur.",
      "joinedAt": "Dołączył",
      "missing": "Brak"
    }
  },
  "en": {
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
    },
    "details": {
      "phoneNumber": "Phone",
      "dateOfBirth": "Birth date",
      "joinedAt": "Joined",
      "missing": "Missing"
    }
  }
}
</i18n>
