<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AttendanceEditorMemberListItem } from '@/read/ListMembersForAttendanceEditorQuery'
import {
  SESSION_TIME_STEP_SECONDS,
  buildSessionStart,
  type SessionField
} from '@/ui/composables/useAttendanceEditor'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  matchesAgeValueRange
} from '@/ui/utils/ageRange'

type AttendanceEditorMode = 'create' | 'edit'

const props = withDefaults(
  defineProps<{
    activeSessionField: SessionField | null
    interactionLocked?: boolean
    isLoading: boolean
    isSubmitting: boolean
    loadFailed: boolean
    maxAgeFilter: number
    minAgeFilter: number
    mode: AttendanceEditorMode
    recoveryPromptVisible?: boolean
    savedMembers: AttendanceEditorMemberListItem[]
    searchQuery: string
    selectedMemberIds: string[]
    sessionDate: string
    sessionTime: string
    submitBlocked: boolean
    submitError: string
    successMessage: string
  }>(),
  {
    interactionLocked: false,
    recoveryPromptVisible: false
  }
)

const emit = defineEmits<{
  discardDraft: []
  restoreDraft: []
  submit: []
  'toggle-member': [memberId: string]
  'toggle-session-field': [field: SessionField]
  'update:activeSessionField': [value: SessionField | null]
  'update:maxAgeFilter': [value: number]
  'update:minAgeFilter': [value: number]
  'update:searchQuery': [value: string]
  'update:selectedMemberIds': [value: string[]]
  'update:sessionDate': [value: string]
  'update:sessionTime': [value: string]
  'clear-submission-feedback': []
  'commit-session-field': []
  'dismiss-submit-error': []
}>()

const { t, locale } = useI18n({ useScope: 'local' })

const searchQueryModel = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit('update:searchQuery', value)
})
const minAgeFilterModel = computed({
  get: () => props.minAgeFilter,
  set: (value: number) => emit('update:minAgeFilter', value)
})
const maxAgeFilterModel = computed({
  get: () => props.maxAgeFilter,
  set: (value: number) => emit('update:maxAgeFilter', value)
})
const sessionDateModel = computed({
  get: () => props.sessionDate,
  set: (value: string) => emit('update:sessionDate', value)
})
const sessionTimeModel = computed({
  get: () => props.sessionTime,
  set: (value: string) => emit('update:sessionTime', value)
})
const selectedMembersCount = computed(() => props.selectedMemberIds.length)
const totalMembersCount = computed(() => props.savedMembers.length)
const sessionStart = computed(() =>
  buildSessionStart(props.sessionDate, props.sessionTime)
)
const filteredMembers = computed(() => {
  return props.savedMembers
    .filter((member) => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
      const matchesSearch = fullName.includes(props.searchQuery.toLowerCase())
      // What: filter attendance rows by precomputed age from the read model. Why: this screen now consumes a least-privilege roster payload that omits raw birth dates.
      const matchesAge = matchesAgeValueRange(
        member.age,
        props.minAgeFilter,
        props.maxAgeFilter
      )

      return matchesSearch && matchesAge
    })
    .sort((left, right) => {
      // What: keep checked-in members at the top in both create and edit. Why: the coach needs immediate confirmation of the marked roster without losing alphabetical scanning inside each group.
      const leftSelected = Number(isSelected(left.id))
      const rightSelected = Number(isSelected(right.id))

      return rightSelected - leftSelected
    })
})
const emptyStateKey = computed(() => {
  if (props.loadFailed) {
    return 'states.loadError'
  }

  return totalMembersCount.value === 0 ? 'states.empty' : 'states.noMatches'
})
const sessionDateLabel = computed(() => formatSessionDate(sessionStart.value))
const sessionTimeLabel = computed(() => formatSessionTime(sessionStart.value))
const submitLabel = computed(() =>
  props.isSubmitting
    ? t(`modes.${props.mode}.actions.submitting`)
    : t(`modes.${props.mode}.actions.submit`)
)

function isSelected(memberId: string) {
  return props.selectedMemberIds.includes(memberId)
}

function formatSessionDate(value: Date | null): string {
  if (!value) {
    return t('fields.date')
  }

  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(value)
}

function formatSessionTime(value: Date | null): string {
  if (!value) {
    return t('fields.time')
  }

  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)
}

function formatMemberAge(member: AttendanceEditorMemberListItem) {
  // What: always format attendance rows with numeric ages. Why: attendance members now derive age from required birth dates, so this list no longer needs an unknown-age branch.
  return t('table.age', { age: member.age })
}
</script>

<template>
  <div class="attendance-view mx-auto max-w-4xl pt-4 pb-12">
    <div
      v-if="recoveryPromptVisible"
      class="attendance-recovery-dialog-backdrop"
    >
      <section
        aria-labelledby="attendance-draft-recovery-title"
        aria-modal="true"
        class="attendance-recovery-dialog message-banner"
        role="dialog"
      >
        <strong id="attendance-draft-recovery-title">{{
          t('modes.create.draftRecovery.title')
        }}</strong>
        <span>{{ t('modes.create.draftRecovery.body') }}</span>
        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            class="attendance-action-button attendance-action-button--primary w-full sm:w-auto"
            type="button"
            @click="emit('restoreDraft')"
          >
            {{ t('modes.create.draftRecovery.continue') }}
          </button>
          <button
            class="attendance-action-button w-full sm:w-auto"
            type="button"
            @click="emit('discardDraft')"
          >
            {{ t('modes.create.draftRecovery.discard') }}
          </button>
        </div>
      </section>
    </div>

    <section class="mb-10 flex flex-col gap-3">
      <p
        class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
      >
        {{ t(`modes.${mode}.sessionEyebrow`) }}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button
          id="attendance-session-date-trigger"
          class="attendance-session-chip attendance-session-chip--primary"
          :disabled="interactionLocked"
          :aria-controls="
            activeSessionField === 'date' ? 'attendance-date' : undefined
          "
          :aria-expanded="activeSessionField === 'date'"
          :aria-label="t('session.changeDate')"
          type="button"
          @click="emit('toggle-session-field', 'date')"
        >
          <AppIcon name="calendar_today" />
          <span>{{ sessionDateLabel }}</span>
        </button>
        <button
          id="attendance-session-time-trigger"
          class="attendance-session-chip attendance-session-chip--secondary"
          :disabled="interactionLocked"
          :aria-controls="
            activeSessionField === 'time' ? 'attendance-time' : undefined
          "
          :aria-expanded="activeSessionField === 'time'"
          :aria-label="t('session.changeTime')"
          type="button"
          @click="emit('toggle-session-field', 'time')"
        >
          <span>{{ sessionTimeLabel }}</span>
          <AppIcon name="expand_more" />
        </button>
      </div>
      <div
        v-if="activeSessionField"
        class="attendance-session-editor max-w-sm border border-on-surface/15 bg-surface-container-low px-4 py-4"
      >
        <label
          class="mb-2 block font-label text-[0.6875rem] font-bold uppercase tracking-tighter text-secondary"
          :for="
            activeSessionField === 'date'
              ? 'attendance-date'
              : 'attendance-time'
          "
        >
          {{
            activeSessionField === 'date' ? t('fields.date') : t('fields.time')
          }}
        </label>
        <input
          v-if="activeSessionField === 'date'"
          id="attendance-date"
          v-model="sessionDateModel"
          class="w-full border-x-0 border-t-0 border-b border-on-surface bg-transparent px-0 py-2 font-mono text-sm uppercase focus:border-primary focus:ring-0"
          type="date"
          @change="emit('commit-session-field')"
          @input="emit('clear-submission-feedback')"
        />
        <input
          v-else
          id="attendance-time"
          v-model="sessionTimeModel"
          class="w-full border-x-0 border-t-0 border-b border-on-surface bg-transparent px-0 py-2 font-mono text-sm uppercase focus:border-primary focus:ring-0"
          type="time"
          :step="SESSION_TIME_STEP_SECONDS"
          @change="emit('commit-session-field')"
          @input="emit('clear-submission-feedback')"
        />
      </div>
    </section>

    <div v-if="successMessage" class="mb-6">
      <div class="message-banner message-banner--success">
        <strong>{{ t(`modes.${mode}.feedbackSuccessTitle`) }}</strong>
        <span>{{ successMessage }}</span>
      </div>
    </div>

    <!-- What: surface attendance save failures on the shared floating card. Why: create and edit routes should expose recoverable write problems in the same place as the rest of the app instead of burying them inside the editor column. -->
    <FloatingErrorAlert
      v-if="submitError"
      :message="submitError"
      :title="t(`modes.${mode}.errorsTitle`)"
      top-offset="shell"
      @dismiss="emit('dismiss-submit-error')"
    />

    <!-- What: keep filters and the roster in one continuous surface across attendance create and edit. Why: coaches should relearn this phone-sized scanning pattern only once even though one route creates a session and the other updates it. -->
    <section class="mb-4 pb-2">
      <div class="flex flex-col gap-2">
        <AgeRangeFilter
          v-model:min-value="minAgeFilterModel"
          v-model:max-value="maxAgeFilterModel"
          :max-bound="AGE_FILTER_MAX"
          :min-bound="AGE_FILTER_MIN"
        />
        <div class="mt-6">
          <SearchBar
            v-model="searchQueryModel"
            input-id="attendance-search"
            :input-label="t('search.label')"
            :placeholder="t('search.placeholder')"
          />
        </div>
      </div>
    </section>

    <section class="mb-10">
      <div class="border-b border-outline-variant px-4 py-3">
        <div
          class="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
        >
          {{ t('table.members') }}
        </div>
      </div>

      <div
        v-if="isLoading"
        class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
      >
        {{ t('states.loading') }}
      </div>

      <div
        v-else-if="filteredMembers.length === 0"
        class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
      >
        {{ t(emptyStateKey) }}
      </div>

      <button
        v-for="member in filteredMembers"
        v-else
        :key="member.id"
        class="attendance-member-row grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-outline-variant px-4 py-4 text-left transition-colors"
        :disabled="interactionLocked"
        :class="{
          'attendance-member-row--selected': isSelected(member.id)
        }"
        type="button"
        @click="emit('toggle-member', member.id)"
      >
        <div class="min-w-0">
          <p
            class="truncate font-headline text-xl font-bold uppercase tracking-tight"
          >
            {{ member.firstName }} {{ member.lastName }}
          </p>
          <p
            class="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em]"
          >
            {{ formatMemberAge(member) }}
          </p>
        </div>

        <div class="flex items-center justify-end">
          <span
            v-if="isSelected(member.id)"
            class="attendance-member-row__status attendance-member-row__status--selected"
          >
            <AppIcon name="check_circle" />
          </span>
          <span v-else class="attendance-member-row__status">
            <AppIcon name="add" />
          </span>
        </div>
      </button>
    </section>

    <section
      class="attendance-summary-card mb-8 grid gap-2 overflow-hidden border border-on-surface px-5 py-5 text-white md:max-w-sm"
    >
      <p
        class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-white/75"
      >
        {{ t('summary.eyebrow') }}
      </p>
      <div class="flex items-end gap-3">
        <p class="font-headline text-5xl font-black leading-none">
          {{ String(selectedMembersCount).padStart(2, '0') }}
        </p>
        <p class="pb-1 font-mono text-xs uppercase text-white/70">
          {{ t('summary.total', { total: totalMembersCount }) }}
        </p>
      </div>
    </section>

    <section
      class="sticky bottom-24 z-10 border border-on-surface bg-surface p-4 hard-shadow"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm leading-6 text-secondary">
          {{ t(`modes.${mode}.actions.help`) }}
        </p>
        <button
          class="attendance-action-button attendance-action-button--primary w-full sm:w-auto"
          :disabled="submitBlocked"
          type="button"
          @click="emit('submit')"
        >
          {{ submitLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* What: present draft recovery as a centered blocking dialog. Why: when a coach returns to a saved create draft, they must choose whether to continue it before touching the live roster. */
.attendance-recovery-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.18);
}

.attendance-recovery-dialog {
  width: min(100%, 28rem);
  border: 1px solid var(--color-on-surface);
  border-radius: 0;
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: 2px 2px 0 0 rgba(26, 28, 28, 0.92);
}

.attendance-recovery-dialog strong {
  color: var(--color-on-surface);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.attendance-recovery-dialog span {
  font-family: var(--font-mono);
}

.attendance-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3.25rem;
  padding: 0 1.2rem;
  border: 1px solid var(--color-on-surface);
  border-radius: 0;
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-mono);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  box-shadow: 2px 2px 0 0 rgba(26, 28, 28, 0.92);
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 75ms ease,
    color 75ms ease;
}

.attendance-action-button:hover,
.attendance-action-button:focus-visible {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.attendance-action-button:focus-visible {
  outline: none;
}

.attendance-action-button:active {
  transform: scale(0.95);
  box-shadow: none;
}

.attendance-action-button:disabled {
  opacity: 0.5;
  box-shadow: none;
}

.attendance-action-button--primary {
  background: var(--color-primary);
  color: white;
}

.attendance-session-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(16, 59, 55, 0.18);
  padding: 0.7rem 0.95rem;
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

/* What: keep the training date and time editable from the route heading on both attendance routes. Why: create and edit should share one mobile-first place where coaches adjust the session before scanning the roster. */
.attendance-session-chip--primary {
  background: color-mix(in srgb, var(--color-primary) 9%, white);
  color: var(--color-primary);
  font-family: var(--font-headline);
  font-size: clamp(1.85rem, 5vw, 3.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.attendance-session-chip--secondary {
  background: var(--color-surface-container-low);
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.attendance-session-chip:hover,
.attendance-session-chip[aria-expanded='true'] {
  border-color: rgba(174, 20, 23, 0.42);
  background: color-mix(in srgb, var(--color-surface-container-low) 82%, white);
}

.attendance-session-editor {
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.12);
}

.attendance-age-filter__input::-webkit-slider-thumb {
  pointer-events: auto;
}

.attendance-member-row {
  background: color-mix(in srgb, var(--color-surface) 78%, white);
}

.attendance-member-row:hover {
  background: var(--color-surface-container-low);
}

.attendance-member-row--selected {
  background: linear-gradient(
    135deg,
    rgba(174, 20, 23, 0.96),
    rgba(185, 29, 29, 0.92)
  );
  color: white;
}

.attendance-member-row--selected:hover {
  background: linear-gradient(
    135deg,
    rgba(174, 20, 23, 1),
    rgba(185, 29, 29, 0.96)
  );
}

.attendance-member-row__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(16, 59, 55, 0.18);
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.7);
}

.attendance-member-row__status--selected {
  border-color: rgba(255, 255, 255, 0.35);
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.attendance-summary-card {
  position: relative;
  background:
    linear-gradient(135deg, rgba(174, 20, 23, 0.96), rgba(185, 29, 29, 0.92)),
    var(--color-primary);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}
</style>

<i18n lang="json">
{
  "pl": {
    "session": {
      "changeDate": "Zmień datę treningu",
      "changeTime": "Zmień godzinę treningu"
    },
    "search": {
      "label": "Filtr",
      "placeholder": "Wpisz imię i nazwisko"
    },
    "fields": {
      "date": "Data treningu",
      "time": "Godzina treningu"
    },
    "table": {
      "members": "Lista uczestników",
      "age": "Wiek {age}",
      "ageUnknown": "Wiek nieznany"
    },
    "summary": {
      "eyebrow": "Suma obecnych",
      "total": "/ {total} osób"
    },
    "states": {
      "loading": "Ładowanie członków...",
      "empty": "Brak zapisanych członków do zaznaczenia.",
      "noMatches": "Brak członków pasujących do filtra.",
      "loadError": "Nie udało się wczytać członków z lokalnej bazy."
    },
    "modes": {
      "create": {
        "sessionEyebrow": "Lista obecności",
        "feedbackSuccessTitle": "Lista zapisana",
        "errorsTitle": "Nie udało się zapisać listy",
        "actions": {
          "help": "Lista zapisuje się raz dla wybranego terminu, dlatego najpierw zaznacz pełny skład i dopiero potem potwierdź.",
          "submit": "Zapisz obecność",
          "submitting": "Zapisywanie..."
        },
        "draftRecovery": {
          "title": "Masz niezapisaną listę obecności",
          "body": "Możesz wrócić do ostatniej lokalnej wersji albo ją odrzucić i zacząć nową listę dla kolejnego treningu.",
          "continue": "Wróć do listy",
          "discard": "Nowa lista"
        }
      },
      "edit": {
        "sessionEyebrow": "Edycja obecności",
        "feedbackSuccessTitle": "Zmiany zapisane",
        "errorsTitle": "Nie udało się zapisać zmian",
        "actions": {
          "help": "Zmiany nadpiszą zapisany trening, więc sprawdź skład i termin przed potwierdzeniem.",
          "submit": "Zapisz zmiany",
          "submitting": "Zapisywanie..."
        }
      }
    }
  },
  "en": {
    "session": {
      "changeDate": "Change training date",
      "changeTime": "Change training time"
    },
    "search": {
      "label": "Filter",
      "placeholder": "Enter first and last name"
    },
    "fields": {
      "date": "Training date",
      "time": "Training time"
    },
    "table": {
      "members": "Participants",
      "age": "Age {age}",
      "ageUnknown": "Age unknown"
    },
    "summary": {
      "eyebrow": "Present total",
      "total": "/ {total} people"
    },
    "states": {
      "loading": "Loading members...",
      "empty": "There are no saved members to mark.",
      "noMatches": "No members match the current filter.",
      "loadError": "The local member list could not be loaded."
    },
    "modes": {
      "create": {
        "sessionEyebrow": "Attendance list",
        "feedbackSuccessTitle": "Attendance saved",
        "errorsTitle": "Attendance could not be saved",
        "actions": {
          "help": "The list is saved once for the selected session, so mark the full roster first and confirm only when it is complete.",
          "submit": "Save attendance",
          "submitting": "Saving..."
        },
        "draftRecovery": {
          "title": "You have an unsaved attendance list",
          "body": "Return to the latest local draft or discard it and start a new list for the next training session.",
          "continue": "Return to draft",
          "discard": "Start new list"
        }
      },
      "edit": {
        "sessionEyebrow": "Edit attendance",
        "feedbackSuccessTitle": "Changes saved",
        "errorsTitle": "Attendance changes could not be saved",
        "actions": {
          "help": "Saving will overwrite the stored session, so confirm the roster and training time before you submit.",
          "submit": "Save changes",
          "submitting": "Saving..."
        }
      }
    }
  }
}
</i18n>
