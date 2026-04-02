<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { db } from '@/db'
import {
  InvalidMemberBirthDateError,
  InvalidMemberJoinDateError,
  InvalidMemberNameError,
  MemberAlreadyExistsError,
  MemberNotFoundError
} from '@/domain/model/member'
import { InvalidPhoneNumberError } from '@/domain/model/vo/PhoneNumber'
import type { PersistedMember } from '@/infra'
import { useAppServices } from '@/ui/appServices'
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
const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const savedMembers = ref<PersistedMember[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const maxAgeFilter = ref(AGE_FILTER_MAX)
const minAgeFilter = ref(AGE_FILTER_MIN)

const openMemberId = ref<string | null>(null)
const editingMemberId = ref<string | null>(null)
const editFirstName = ref('')
const editLastName = ref('')
const editPhoneNumber = ref('')
const editDateOfBirth = ref('')
const editJoinedAt = ref('')
const isSavingEdit = ref(false)
type EditErrorKey =
  | 'submit'
  | 'invalidPhoneNumber'
  | 'alreadyExists'
  | 'invalidBirthDate'
  | 'invalidJoinDate'
  | 'invalidName'
  | 'notFound'
const editErrorKey = ref<EditErrorKey | null>(null)
const editError = computed(() =>
  editErrorKey.value === null ? '' : t(`edit.errors.${editErrorKey.value}`)
)
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

function formatDateForInput(value: Date | undefined): string {
  if (!value) return ''
  return value.toISOString().split('T')[0]
}

function startEditing(member: PersistedMember) {
  editErrorKey.value = null
  editingMemberId.value = member.id
  editFirstName.value = member.firstName
  editLastName.value = member.lastName
  editPhoneNumber.value = member.phoneNumber
  editDateOfBirth.value = formatDateForInput(member.dateOfBirth)
  editJoinedAt.value = formatDateForInput(member.joinedAt)
}

function cancelEditing() {
  editingMemberId.value = null
  editErrorKey.value = null
}

function toUtcDate(value: string) {
  if (!value) return undefined
  return new Date(`${value}T00:00:00Z`)
}

function resolveEditErrorKey(error: unknown): EditErrorKey {
  if (error instanceof InvalidPhoneNumberError) return 'invalidPhoneNumber'
  if (error instanceof MemberAlreadyExistsError) return 'alreadyExists'
  if (error instanceof InvalidMemberBirthDateError) return 'invalidBirthDate'
  if (error instanceof InvalidMemberJoinDateError) return 'invalidJoinDate'
  if (error instanceof InvalidMemberNameError) return 'invalidName'
  if (error instanceof MemberNotFoundError) return 'notFound'
  return 'submit'
}

async function saveMemberEdit(memberId: string) {
  editErrorKey.value = null
  isSavingEdit.value = true

  try {
    await useCases.updateMember.handle({
      memberId,
      firstName: editFirstName.value.trim(),
      lastName: editLastName.value.trim(),
      phoneNumber: editPhoneNumber.value.trim(),
      ...(editDateOfBirth.value
        ? { dateOfBirth: toUtcDate(editDateOfBirth.value) }
        : {}),
      ...(editJoinedAt.value ? { joinedAt: toUtcDate(editJoinedAt.value) } : {})
    })

    // What: update the rendered member immediately after saving. Why: local-first UX should confirm edits instantly instead of waiting for a full table reload.
    savedMembers.value = savedMembers.value.map((member) =>
      member.id === memberId
        ? {
            ...member,
            firstName: editFirstName.value.trim().toLowerCase(),
            lastName: editLastName.value.trim().toLowerCase(),
            phoneNumber: editPhoneNumber.value.trim(),
            dateOfBirth: toUtcDate(editDateOfBirth.value),
            joinedAt: toUtcDate(editJoinedAt.value)
          }
        : member
    )
    cancelEditing()
  } catch (error: unknown) {
    editErrorKey.value = resolveEditErrorKey(error)
  } finally {
    isSavingEdit.value = false
  }
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
          <div
            class="col-span-2 md:col-span-4 flex justify-end border-t border-outline-variant pt-3"
          >
            <button
              v-if="editingMemberId !== member.id"
              type="button"
              class="bg-surface-container-low text-on-surface px-4 py-2 border border-on-surface hard-shadow text-xs font-mono uppercase"
              @click="startEditing(member)"
            >
              {{ t('edit.actions.open') }}
            </button>
          </div>
          <form
            v-if="editingMemberId === member.id"
            class="col-span-2 md:col-span-4 mt-2 border-t border-outline-variant pt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            @submit.prevent="saveMemberEdit(member.id)"
          >
            <!-- What: inline edit fields live under expanded member details. Why: list users can adjust data in place without leaving this mobile-first workflow. -->
            <div class="flex flex-col">
              <label class="font-label text-[0.6rem] text-secondary uppercase font-bold">{{
                t('edit.fields.firstName')
              }}</label>
              <input
                v-model="editFirstName"
                type="text"
                class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
                required
              />
            </div>
            <div class="flex flex-col">
              <label class="font-label text-[0.6rem] text-secondary uppercase font-bold">{{
                t('edit.fields.lastName')
              }}</label>
              <input
                v-model="editLastName"
                type="text"
                class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
                required
              />
            </div>
            <div class="flex flex-col">
              <label class="font-label text-[0.6rem] text-secondary uppercase font-bold">{{
                t('edit.fields.phoneNumber')
              }}</label>
              <input
                v-model="editPhoneNumber"
                type="tel"
                class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
                required
              />
            </div>
            <div class="flex flex-col">
              <label class="font-label text-[0.6rem] text-secondary uppercase font-bold">{{
                t('edit.fields.dateOfBirth')
              }}</label>
              <input
                v-model="editDateOfBirth"
                type="date"
                class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
              />
            </div>
            <div class="flex flex-col">
              <label class="font-label text-[0.6rem] text-secondary uppercase font-bold">{{
                t('edit.fields.joinedAt')
              }}</label>
              <input
                v-model="editJoinedAt"
                type="date"
                class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
              />
            </div>
            <p
              v-if="editError"
              class="md:col-span-2 text-danger font-mono text-xs uppercase"
            >
              {{ editError }}
            </p>
            <div class="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 border border-on-surface font-mono text-xs uppercase"
                @click="cancelEditing"
              >
                {{ t('edit.actions.cancel') }}
              </button>
              <button
                type="submit"
                class="px-4 py-2 border border-on-surface font-mono text-xs uppercase bg-primary text-white disabled:opacity-50"
                :disabled="isSavingEdit"
              >
                {{
                  isSavingEdit
                    ? t('edit.actions.saving')
                    : t('edit.actions.save')
                }}
              </button>
            </div>
          </form>
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
    },
    "edit": {
      "actions": {
        "open": "Edytuj",
        "cancel": "Anuluj",
        "save": "Zapisz zmiany",
        "saving": "Zapisywanie"
      },
      "fields": {
        "firstName": "Imię",
        "lastName": "Nazwisko",
        "phoneNumber": "Telefon",
        "dateOfBirth": "Data ur.",
        "joinedAt": "Dołączył"
      },
      "errors": {
        "submit": "Nie udało się zapisać zmian.",
        "invalidPhoneNumber": "Podaj poprawny numer telefonu.",
        "alreadyExists": "Członek o tych danych już istnieje.",
        "invalidBirthDate": "Data urodzenia jest nieprawidłowa.",
        "invalidJoinDate": "Data dołączenia jest nieprawidłowa.",
        "invalidName": "Imię lub nazwisko jest nieprawidłowe.",
        "notFound": "Nie znaleziono członka do aktualizacji."
      }
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
    },
    "edit": {
      "actions": {
        "open": "Edit",
        "cancel": "Cancel",
        "save": "Save changes",
        "saving": "Saving"
      },
      "fields": {
        "firstName": "First name",
        "lastName": "Last name",
        "phoneNumber": "Phone",
        "dateOfBirth": "Birth date",
        "joinedAt": "Joined"
      },
      "errors": {
        "submit": "Failed to save changes.",
        "invalidPhoneNumber": "Enter a valid phone number.",
        "alreadyExists": "A member with this identity already exists.",
        "invalidBirthDate": "Birth date is invalid.",
        "invalidJoinDate": "Join date is invalid.",
        "invalidName": "First or last name is invalid.",
        "notFound": "Member could not be found for update."
      }
    }
  }
}
</i18n>
