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
} from '@/domain/model/Member'
import { InvalidPhoneNumberError } from '@/domain/model/vo/PhoneNumber'
import type { PersistedMember } from '@/infra'
import { useAppServices } from '@/ui/appServices'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import MembersSortTool from '@/ui/components/MembersSortTool.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
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

const { useCases } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })
const savedMembers = ref<PersistedMember[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const maxAgeFilter = ref(AGE_FILTER_MAX)
const minAgeFilter = ref(AGE_FILTER_MIN)
const memberSortField = ref<MemberSortField>('firstName')
const memberSortDirection = ref<MemberSortDirection>('asc')

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

function formatMemberName(member: PersistedMember): string {
  return `${member.firstName} ${member.lastName}`
}

async function loadSavedMembers() {
  isLoading.value = true
  try {
    await db.open()
    savedMembers.value = await db.members.toArray()
  } catch (error) {
    console.error('Failed to load members', error)
  } finally {
    isLoading.value = false
  }
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

function toPhoneDialHref(phoneNumber: string): string {
  // What: convert roster phone text into a dialable URI before rendering. Why: inline edit previews can keep spacing while mobile call intents require a compact tel target.
  return `tel:${phoneNumber.replace(/\s+/g, '')}`
}

function toPhoneMessageHref(phoneNumber: string): string {
  // What: convert roster phone text into a message URI before rendering. Why: the member list should offer a direct SMS path beside calling without forcing users to retype numbers on mobile.
  return `sms:${phoneNumber.replace(/\s+/g, '')}`
}

function startEditing(member: PersistedMember) {
  editErrorKey.value = null
  editingMemberId.value = member.id
  editFirstName.value = member.firstName
  editLastName.value = member.lastName
  // What: hydrate the inline edit field with a real empty string when the stored member has no phone. Why: the mobile edit form still expects text input state even though persistence now allows the field to be missing entirely.
  editPhoneNumber.value = member.phoneNumber ?? ''
  editDateOfBirth.value = formatDateForInput(member.dateOfBirth)
  editJoinedAt.value = formatDateForInput(member.joinedAt)
}

function cancelEditing() {
  editingMemberId.value = null
  editErrorKey.value = null
}

function dismissEditError() {
  // What: let roster editing clear the shared floating error card after it has been read. Why: the coach should be able to keep the member form open for corrections without a stale warning lingering at the top of the screen.
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
            // What: mirror the new persisted member shape during optimistic updates. Why: the list should not reintroduce the old empty-string sentinel while waiting for the next Dexie read.
            ...(editPhoneNumber.value.trim()
              ? { phoneNumber: editPhoneNumber.value.trim() }
              : { phoneNumber: undefined }),
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

onMounted(() => {
  void loadSavedMembers()
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
              <!-- What: split phone contact into two explicit actions: call and msg. Why: the roster should expose both common outreach paths as immediate taps instead of hiding one behind manual copy or context menus. -->
              <div
                v-if="member.phoneNumber?.trim()"
                class="members-list-view__phone-actions"
              >
                <span class="font-mono text-sm">{{ member.phoneNumber }}</span>
                <div class="members-list-view__phone-actions-row">
                  <a
                    class="members-list-view__phone-action"
                    :href="toPhoneDialHref(member.phoneNumber)"
                    :aria-label="`${t('details.actions.call')} ${member.phoneNumber}`"
                    :title="`${t('details.actions.call')} ${member.phoneNumber}`"
                  >
                    {{ t('details.actions.call') }}
                  </a>
                  <a
                    class="members-list-view__phone-action members-list-view__phone-action--secondary"
                    :href="toPhoneMessageHref(member.phoneNumber)"
                    :aria-label="`${t('details.actions.msg')} ${member.phoneNumber}`"
                    :title="`${t('details.actions.msg')} ${member.phoneNumber}`"
                  >
                    {{ t('details.actions.msg') }}
                  </a>
                </div>
              </div>
              <span v-else class="font-mono text-sm">{{
                t('details.missing')
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
              <!-- What: inline member actions now reuse the shared AppButton primitive. Why: edit flows should inherit the same tap targets and state styling as the rest of this mobile-first PWA instead of shipping view-specific button markup. -->
              <AppButton
                v-if="editingMemberId !== member.id"
                variant="secondary"
                type="button"
                @click="startEditing(member)"
              >
                {{ t('edit.actions.open') }}
              </AppButton>
            </div>
            <form
              v-if="editingMemberId === member.id"
              class="col-span-2 md:col-span-4 mt-2 border-t border-outline-variant pt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
              @submit.prevent="saveMemberEdit(member.id)"
            >
              <!-- What: inline edit fields live under expanded member details. Why: list users can adjust data in place without leaving this mobile-first workflow. -->
              <div class="flex flex-col">
                <!-- What: keep the edit labels plain even for mandatory identity fields. Why: the explicit required marker is reserved for the add-member flow, while edit stays visually lighter for quick inline corrections. -->
                <label
                  class="font-label text-[0.6rem] text-secondary uppercase font-bold"
                  >{{ t('edit.fields.firstName') }}</label
                >
                <!-- What: render the editable first name in uppercase. Why: the edit state should match the member list presentation, so coaches do not see the name switch casing mid-flow. -->
                <input
                  v-model="editFirstName"
                  type="text"
                  class="bg-transparent border-b border-on-surface py-2 font-mono text-sm uppercase"
                  required
                />
              </div>
              <div class="flex flex-col">
                <label
                  class="font-label text-[0.6rem] text-secondary uppercase font-bold"
                  >{{ t('edit.fields.lastName') }}</label
                >
                <!-- What: render the editable last name in uppercase. Why: the edit form should preserve the same visual identity cues as the roster rows instead of dropping back to lowercase. -->
                <input
                  v-model="editLastName"
                  type="text"
                  class="bg-transparent border-b border-on-surface py-2 font-mono text-sm uppercase"
                  required
                />
              </div>
              <div class="flex flex-col">
                <label
                  class="font-label text-[0.6rem] text-secondary uppercase font-bold"
                  >{{ t('edit.fields.phoneNumber') }}</label
                >
                <input
                  v-model="editPhoneNumber"
                  type="tel"
                  class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
                />
              </div>
              <div class="flex flex-col">
                <label
                  class="font-label text-[0.6rem] text-secondary uppercase font-bold"
                  >{{ t('edit.fields.dateOfBirth') }}</label
                >
                <input
                  v-model="editDateOfBirth"
                  type="date"
                  class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
                />
              </div>
              <div class="flex flex-col">
                <label
                  class="font-label text-[0.6rem] text-secondary uppercase font-bold"
                  >{{ t('edit.fields.joinedAt') }}</label
                >
                <input
                  v-model="editJoinedAt"
                  type="date"
                  class="bg-transparent border-b border-on-surface py-2 font-mono text-sm"
                />
              </div>
              <div class="md:col-span-2 flex justify-end gap-2">
                <AppButton
                  variant="secondary"
                  type="button"
                  @click="cancelEditing"
                >
                  {{ t('edit.actions.cancel') }}
                </AppButton>
                <AppButton type="submit" :disabled="isSavingEdit">
                  {{
                    isSavingEdit
                      ? t('edit.actions.saving')
                      : t('edit.actions.save')
                  }}
                </AppButton>
              </div>
            </form>
          </div>
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

.members-list-view__phone-actions {
  display: grid;
  gap: 0.45rem;
}

.members-list-view__phone-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.members-list-view__phone-action {
  /* What: style call and msg as compact tactile buttons in one shared recipe. Why: these sibling actions should read as a deliberate pair and stay obvious targets in dense mobile roster rows. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  min-width: 3.5rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-on-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-label);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: lowercase;
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 75ms ease;
}

.members-list-view__phone-action--secondary {
  color: var(--color-on-surface);
  background: var(--color-surface-container-low);
}

.members-list-view__phone-action:hover {
  transform: translate(2px, 2px);
  box-shadow: none;
  background: var(--color-surface-container-low);
}

.members-list-view__phone-action:active {
  transform: scale(0.97);
  box-shadow: none;
}

.members-list-view__phone-action:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 2px;
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
    },
    "details": {
      "phoneNumber": "Telefon",
      "dateOfBirth": "Data ur.",
      "joinedAt": "Dołączył",
      "missing": "Brak",
      "actions": {
        "call": "zadzwoń",
        "msg": "sms"
      }
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
    },
    "details": {
      "phoneNumber": "Phone",
      "dateOfBirth": "Birth date",
      "joinedAt": "Joined",
      "missing": "Missing",
      "actions": {
        "call": "call",
        "msg": "msg"
      }
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
