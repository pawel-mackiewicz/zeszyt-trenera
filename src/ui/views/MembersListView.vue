<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { db, type PersistedMember } from '@/db'
import { useRouter } from '@/ui/router/runtime'
import AppIcon from '@/ui/components/AppIcon.vue'

const router = useRouter()
const { t } = useI18n({ useScope: 'local' })
const savedMembers = ref<PersistedMember[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const maxAgeFilter = ref(80)
const minAgeFilter = ref(5)

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

function calculateAge(dateString: string | undefined): number {
  if (!dateString) return 999
  const birthDate = new Date(dateString)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const filteredMembers = computed(() => {
  return savedMembers.value.filter((m) => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchQuery.value.toLowerCase())

    // Simplistic age filter implementation, using optional dateOfBirth
    // Assuming dateOfBirth in PersistedMember is stored correctly (string or date)
    let age = 30 // fallback if no dob
    if (m.dateOfBirth) {
      // Persisted dateOfBirth might be a string depending on serialization or a Date object
      age = calculateAge(
        m.dateOfBirth instanceof Date
          ? m.dateOfBirth.toISOString()
          : (m.dateOfBirth as string)
      )
    }
    const matchesAge = age >= minAgeFilter.value && age <= maxAgeFilter.value

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
      <div class="md:col-span-11 relative">
        <label
          class="font-label text-[0.6875rem] font-bold uppercase tracking-tighter mb-1 block text-secondary"
          >{{ t('search.label') }}</label
        >
        <div class="flex items-center gap-4">
          <AppIcon class="text-primary" name="search" />
          <input
            v-model="searchQuery"
            class="w-full bg-transparent border-none p-0 focus:ring-0 font-mono text-lg placeholder:text-outline-variant uppercase"
            :placeholder="t('search.placeholder')"
            type="text"
          />
        </div>
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
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-end mb-2">
          <label
            class="font-label text-[0.6875rem] font-bold uppercase tracking-tighter block text-secondary"
            >{{ t('filters.age.label') }}</label
          >
          <span class="font-mono text-sm font-bold text-primary uppercase">{{
            t('filters.age.range', { min: minAgeFilter, max: maxAgeFilter })
          }}</span>
        </div>
        <div class="relative flex items-center gap-4">
          <span class="font-mono text-[10px] text-secondary font-bold">5</span>
          <div class="relative w-full h-2 flex items-center">
            <input
              v-model="minAgeFilter"
              class="members-age-filter__input absolute w-full appearance-none bg-transparent z-20"
              max="80"
              min="5"
              style="height: 0"
              type="range"
            />
            <input
              v-model="maxAgeFilter"
              class="members-age-filter__input absolute w-full appearance-none bg-transparent z-20"
              max="80"
              min="5"
              style="height: 0"
              type="range"
            />
            <div class="absolute left-0 right-0 h-[2px] bg-primary"></div>
          </div>
          <span class="font-mono text-[10px] text-secondary font-bold">80</span>
        </div>
      </div>
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

<style scoped>
input[type='range'] {
  -webkit-appearance: none;
  background: transparent;
}

/* The age filter uses two overlapping native sliders, so only the thumbs should catch touch input on mobile. */
.members-age-filter__input {
  pointer-events: none;
}

/* Keeping thumb hit-testing in component CSS avoids relying on generated utility selectors for vendor pseudo-elements. */
.members-age-filter__input::-webkit-slider-thumb {
  pointer-events: auto;
}

/* Firefox needs the same explicit thumb hit area or the overlaid range control becomes untouchable. */
.members-age-filter__input::-moz-range-thumb {
  pointer-events: auto;
}

input[type='range']::-webkit-slider-runnable-track {
  width: 100%;
  height: 0px;
  background: transparent;
  border: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  /* Scoped CSS must use the shared design token names directly because Tailwind utilities no longer expose bare --primary aliases here. */
  background: var(--color-primary);
  border: 1px solid var(--color-on-surface);
  margin-top: -8px;
  cursor: pointer;
  border-radius: 0;
}

input[type='range']::-moz-range-track {
  width: 100%;
  height: 0px;
  background: transparent;
}

input[type='range']::-moz-range-thumb {
  height: 16px;
  width: 16px;
  background: var(--color-primary);
  border: 1px solid var(--color-on-surface);
  cursor: pointer;
  border-radius: 0;
}
</style>

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
    "filters": {
      "age": {
        "label": "Filtruj po wieku",
        "range": "Wiek: {min} - {max}"
      }
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
    "filters": {
      "age": {
        "label": "Filter by age",
        "range": "Age: {min} - {max}"
      }
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
