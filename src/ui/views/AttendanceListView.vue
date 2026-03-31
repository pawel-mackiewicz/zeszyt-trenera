<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  AttendanceListAlreadyExistsError,
  InvalidAttendanceListStartError
} from '@/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/domain/model/member'
import { db } from '@/db'
import type { PersistedMember } from '@/infra'
import { useAppServices } from '@/ui/appServices'
import AppIcon from '@/ui/components/AppIcon.vue'

type SubmitErrorKey =
  | 'missingStart'
  | 'alreadyExists'
  | 'invalidStart'
  | 'memberNotFound'
  | 'submit'
type AttendanceDraft = {
  sessionDate: string
  sessionTime: string
  selectedMemberIds: string[]
}

const { useCases } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })

const savedMembers = ref<PersistedMember[]>([])
const isLoading = ref(true)
const loadFailed = ref(false)
const isSubmitting = ref(false)
const searchQuery = ref('')
const maxAgeFilter = ref(80)
const minAgeFilter = ref(5)
const selectedMemberIds = ref<string[]>([])
const sessionDate = ref('')
const sessionTime = ref('')
const submitErrorKey = ref<SubmitErrorKey | null>(null)
const lastSavedCount = ref(0)
const successVisible = ref(false)
const pendingStoredDraft = ref<AttendanceDraft | null>(null)
const shouldPersistDraft = ref(false)
type SessionField = 'date' | 'time'
const ATTENDANCE_DRAFT_STORAGE_KEY = 'zeszyt-trenera.attendance-draft'
const SESSION_TIME_STEP_MINUTES = 15
const SESSION_TIME_STEP_SECONDS = SESSION_TIME_STEP_MINUTES * 60

// What: track which session value is being edited directly from the heading. Why: the heading is the main context anchor on mobile, so editing there removes the need for a separate dense form row.
const activeSessionField = ref<SessionField | null>(null)

const selectedMembersCount = computed(() => selectedMemberIds.value.length)
const totalMembersCount = computed(() => savedMembers.value.length)
const sessionStart = computed(() => buildSessionStart())
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)
const successMessage = computed(() =>
  successVisible.value
    ? t('feedback.success', { count: lastSavedCount.value })
    : ''
)
const recoveryDecisionPending = computed(
  () => pendingStoredDraft.value !== null
)
const recoveryPromptVisible = computed(
  () => recoveryDecisionPending.value && !isLoading.value
)
// What: expose one source of truth for when saving is unsafe from this screen. Why: the attendance UI must not create accidental empty sessions before the local roster is ready or after loading it failed.
const submitBlocked = computed(
  () =>
    isLoading.value ||
    loadFailed.value ||
    isSubmitting.value ||
    recoveryDecisionPending.value
)
const filteredMembers = computed(() => {
  return savedMembers.value
    .filter((member) => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
      const matchesSearch = fullName.includes(searchQuery.value.toLowerCase())
      const age = calculateAge(member.dateOfBirth)
      const matchesAge = age >= minAgeFilter.value && age <= maxAgeFilter.value

      return matchesSearch && matchesAge
    })
    .sort((left, right) => {
      // What: keep marked members at the top of the filtered roster. Why: during attendance taking on a phone, users need fast confirmation of who is already checked in without losing alphabetical scanning inside each group.
      const leftSelected = Number(isSelected(left.id))
      const rightSelected = Number(isSelected(right.id))

      return rightSelected - leftSelected
    })
})
const emptyStateKey = computed(() => {
  if (loadFailed.value) {
    return 'states.loadError'
  }

  return totalMembersCount.value === 0 ? 'states.empty' : 'states.noMatches'
})
const sessionDateLabel = computed(() => formatSessionDate(sessionStart.value))
const sessionTimeLabel = computed(() => formatSessionTime(sessionStart.value))

function isAttendanceDraft(value: unknown): value is AttendanceDraft {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.sessionDate === 'string' &&
    typeof candidate.sessionTime === 'string' &&
    Array.isArray(candidate.selectedMemberIds) &&
    candidate.selectedMemberIds.every(
      (memberId) => typeof memberId === 'string'
    )
  )
}

function readStoredAttendanceDraft(): AttendanceDraft | null {
  try {
    const storedDraft = window.localStorage.getItem(
      ATTENDANCE_DRAFT_STORAGE_KEY
    )

    if (!storedDraft) {
      return null
    }

    const parsedDraft = JSON.parse(storedDraft) as unknown

    if (!isAttendanceDraft(parsedDraft)) {
      clearStoredAttendanceDraft()
      return null
    }

    if (parsedDraft.selectedMemberIds.length === 0) {
      // What: treat empty attendance drafts as disposable shell state. Why: showing a blocking recovery modal for a list with nobody selected creates friction without restoring meaningful work.
      clearStoredAttendanceDraft()
      return null
    }

    return {
      sessionDate: parsedDraft.sessionDate,
      sessionTime: parsedDraft.sessionTime,
      // What: normalize restored member ids before the screen hydrates them. Why: localStorage may outlive member edits, so the recovery path must stay resilient to duplicate or stale ids.
      selectedMemberIds: [...new Set(parsedDraft.selectedMemberIds)]
    }
  } catch {
    clearStoredAttendanceDraft()
    return null
  }
}

function writeStoredAttendanceDraft(draft: AttendanceDraft) {
  try {
    window.localStorage.setItem(
      ATTENDANCE_DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    )
  } catch {
    // The attendance screen must stay usable even if this device blocks local draft persistence.
  }
}

function clearStoredAttendanceDraft() {
  try {
    window.localStorage.removeItem(ATTENDANCE_DRAFT_STORAGE_KEY)
  } catch {
    // Recovery is optional; failing to clear storage must not block the live attendance workflow.
  }
}

function resetDraft(now = new Date()) {
  selectedMemberIds.value = []
  sessionDate.value = toDateInputValue(now)
  sessionTime.value = toTimeInputValue(now)
  activeSessionField.value = null
}

function applyDraft(draft: AttendanceDraft) {
  selectedMemberIds.value = draft.selectedMemberIds
  sessionDate.value = draft.sessionDate
  sessionTime.value = draft.sessionTime
  activeSessionField.value = null
}

function persistCurrentDraft() {
  writeStoredAttendanceDraft({
    sessionDate: sessionDate.value,
    sessionTime: sessionTime.value,
    selectedMemberIds: selectedMemberIds.value
  })
}

function enableDraftPersistence() {
  shouldPersistDraft.value = true
  persistCurrentDraft()
}

function startPersistingDraftOnNextChange() {
  void nextTick(() => {
    shouldPersistDraft.value = true
  })
}

function createFreshDraft(
  now = snapDateToSessionTimeGrid(new Date()),
  persistImmediately = true
) {
  clearSubmissionFeedback()
  clearStoredAttendanceDraft()
  pendingStoredDraft.value = null
  shouldPersistDraft.value = false
  resetDraft(now)

  if (persistImmediately) {
    enableDraftPersistence()
    return
  }

  // What: keep "new list" as a true discard action. Why: once the coach rejects the recovered draft, localStorage should stay empty until they actually start building a replacement list.
  startPersistingDraftOnNextChange()
}

async function loadSavedMembers() {
  isLoading.value = true
  loadFailed.value = false

  try {
    await db.open()
    const members = await db.members.toArray()

    // What: sort the attendance roster alphabetically. Why: check-in is a find-and-toggle workflow, so alphabetical order is faster to scan on a phone than creation time.
    savedMembers.value = members.sort((left, right) =>
      `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`,
        locale.value
      )
    )
  } catch (error) {
    loadFailed.value = true
    console.error('Failed to load members for attendance', error)
  } finally {
    isLoading.value = false
  }
}

function calculateAge(value: Date | string | undefined): number {
  if (!value) {
    return 999
  }

  const birthDate = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(birthDate.getTime())) {
    return 999
  }

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--
  }

  return age
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toTimeInputValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function snapDateToSessionTimeGrid(value: Date): Date {
  const snappedValue = new Date(value)
  const minutes = snappedValue.getMinutes()
  const roundedMinutes =
    Math.round(minutes / SESSION_TIME_STEP_MINUTES) * SESSION_TIME_STEP_MINUTES

  snappedValue.setSeconds(0, 0)
  snappedValue.setMinutes(roundedMinutes)

  return snappedValue
}

function snapTimeInputToSessionGrid(value: string): string {
  const [hours, minutes] = value.split(':').map(Number)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value
  }

  // What: keep stored session starts aligned to quarter-hour slots. Why: the mobile time picker now works on a 15-minute cadence, so typed values should land on the same grid the selector exposes.
  return toTimeInputValue(
    snapDateToSessionTimeGrid(new Date(2000, 0, 1, hours, minutes))
  )
}

function buildSessionStart(): Date | null {
  if (!sessionDate.value || !sessionTime.value) {
    return null
  }

  const [year, month, day] = sessionDate.value.split('-').map(Number)
  const [hours, minutes] = sessionTime.value.split(':').map(Number)
  const start = new Date(year, month - 1, day, hours, minutes)

  return Number.isNaN(start.getTime()) ? null : start
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

function clearSubmissionFeedback() {
  submitErrorKey.value = null
  successVisible.value = false
}

function toggleSessionFieldEditor(field: SessionField) {
  if (recoveryDecisionPending.value) {
    return
  }

  clearSubmissionFeedback()
  activeSessionField.value = activeSessionField.value === field ? null : field
}

function commitSessionField() {
  clearSubmissionFeedback()

  if (activeSessionField.value === 'time') {
    sessionTime.value = snapTimeInputToSessionGrid(sessionTime.value)
  }

  activeSessionField.value = null
}

function isSelected(memberId: string) {
  return selectedMemberIds.value.includes(memberId)
}

function toggleMember(memberId: string) {
  if (recoveryDecisionPending.value) {
    return
  }

  clearSubmissionFeedback()

  if (isSelected(memberId)) {
    selectedMemberIds.value = selectedMemberIds.value.filter(
      (savedMemberId) => savedMemberId !== memberId
    )
    return
  }

  selectedMemberIds.value = [...selectedMemberIds.value, memberId]
}

function resolveRecoverableMemberIds(memberIds: string[]) {
  if (loadFailed.value) {
    return [...new Set(memberIds)]
  }

  const savedMemberIds = new Set(savedMembers.value.map((member) => member.id))

  return [...new Set(memberIds)].filter((memberId) =>
    savedMemberIds.has(memberId)
  )
}

function restoreStoredDraft() {
  if (!pendingStoredDraft.value) {
    return
  }

  clearSubmissionFeedback()

  const draftToRestore = pendingStoredDraft.value

  pendingStoredDraft.value = null
  shouldPersistDraft.value = false
  applyDraft({
    ...draftToRestore,
    // What: restore only members that still exist in the local roster. Why: saved drafts can outlive member removals, and recovering them should never reintroduce impossible selections.
    selectedMemberIds: resolveRecoverableMemberIds(
      draftToRestore.selectedMemberIds
    )
  })
  enableDraftPersistence()
}

function resolveSubmitErrorKey(error: unknown): SubmitErrorKey {
  // What: map domain failures to screen-owned recovery copy. Why: the attendance route is the only place that can explain how to fix a duplicate session start or stale member selection.
  if (error instanceof AttendanceListAlreadyExistsError) {
    return 'alreadyExists'
  }

  if (error instanceof InvalidAttendanceListStartError) {
    return 'invalidStart'
  }

  if (error instanceof MemberNotFoundError) {
    return 'memberNotFound'
  }

  return 'submit'
}

async function handleSubmit() {
  // What: guard the save path inside the action, not only in the button state. Why: the roster availability rules must still hold if this handler is triggered before the disabled UI updates or by a future non-button caller.
  if (submitBlocked.value) {
    return
  }

  clearSubmissionFeedback()

  const start = sessionStart.value

  if (!start) {
    submitErrorKey.value = 'missingStart'
    return
  }

  isSubmitting.value = true

  try {
    await useCases.registerAttendanceList.handle({
      memberIds: selectedMemberIds.value,
      start
    })

    clearStoredAttendanceDraft()
    lastSavedCount.value = selectedMemberIds.value.length
    successVisible.value = true
    // What: seed the next draft on the same quarter-hour cadence as the picker. Why: after a successful save, the coach should land on a fresh session time the UI can represent and persist consistently.
    resetDraft(snapDateToSessionTimeGrid(new Date()))
  } catch (error) {
    submitErrorKey.value = resolveSubmitErrorKey(error)
  } finally {
    isSubmitting.value = false
  }
}

watch([sessionDate, sessionTime, selectedMemberIds], () => {
  if (!shouldPersistDraft.value) {
    return
  }

  persistCurrentDraft()
})

onMounted(() => {
  const storedDraft = readStoredAttendanceDraft()

  if (storedDraft) {
    // What: pause draft writes until the coach chooses whether to continue or replace the recovered list. Why: the return flow must never overwrite a recoverable draft before the user makes that call.
    pendingStoredDraft.value = storedDraft
    resetDraft(snapDateToSessionTimeGrid(new Date()))
  } else {
    // What: seed a fresh draft on the same quarter-hour cadence exposed by the picker. Why: returning to attendance without saving should bring the coach back to the same local-first work-in-progress instead of a different empty session.
    createFreshDraft()
  }

  void loadSavedMembers()
})
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
          t('draftRecovery.title')
        }}</strong>
        <span>{{ t('draftRecovery.body') }}</span>
        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            class="attendance-action-button attendance-action-button--primary w-full sm:w-auto"
            type="button"
            @click="restoreStoredDraft"
          >
            {{ t('draftRecovery.continue') }}
          </button>
          <button
            class="attendance-action-button w-full sm:w-auto"
            type="button"
            @click="
              createFreshDraft(snapDateToSessionTimeGrid(new Date()), false)
            "
          >
            {{ t('draftRecovery.discard') }}
          </button>
        </div>
      </section>
    </div>

    <section class="mb-10 flex flex-col gap-3">
      <p
        class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
      >
        {{ t('session.eyebrow') }}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button
          id="attendance-session-date-trigger"
          class="attendance-session-chip attendance-session-chip--primary"
          :disabled="recoveryDecisionPending"
          :aria-controls="
            activeSessionField === 'date' ? 'attendance-date' : undefined
          "
          :aria-expanded="activeSessionField === 'date'"
          :aria-label="t('session.changeDate')"
          type="button"
          @click="toggleSessionFieldEditor('date')"
        >
          <AppIcon name="calendar_today" />
          <span>{{ sessionDateLabel }}</span>
        </button>
        <button
          id="attendance-session-time-trigger"
          class="attendance-session-chip attendance-session-chip--secondary"
          :disabled="recoveryDecisionPending"
          :aria-controls="
            activeSessionField === 'time' ? 'attendance-time' : undefined
          "
          :aria-expanded="activeSessionField === 'time'"
          :aria-label="t('session.changeTime')"
          type="button"
          @click="toggleSessionFieldEditor('time')"
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
          v-model="sessionDate"
          class="w-full border-x-0 border-t-0 border-b border-on-surface bg-transparent px-0 py-2 font-mono text-sm uppercase focus:border-primary focus:ring-0"
          type="date"
          @change="commitSessionField"
          @input="clearSubmissionFeedback"
        />
        <input
          v-else
          id="attendance-time"
          v-model="sessionTime"
          class="w-full border-x-0 border-t-0 border-b border-on-surface bg-transparent px-0 py-2 font-mono text-sm uppercase focus:border-primary focus:ring-0"
          type="time"
          :step="SESSION_TIME_STEP_SECONDS"
          @change="commitSessionField"
          @input="clearSubmissionFeedback"
        />
      </div>
    </section>

    <div v-if="successMessage" class="mb-6">
      <div class="message-banner message-banner--success">
        <strong>{{ t('feedback.successTitle') }}</strong>
        <span>{{ successMessage }}</span>
      </div>
    </div>

    <div v-if="submitError" class="mb-6">
      <div class="message-banner message-banner--danger">
        <strong>{{ t('errors.title') }}</strong>
        <span>{{ submitError }}</span>
      </div>
    </div>

    <!-- What: keep filters and the roster in one continuous surface with a tighter handoff. Why: once the separator lines were removed, the old bottom spacing left an unnecessary visual hole before the member list on mobile. -->
    <section class="mb-4 pb-2">
      <div class="flex flex-col gap-2">
        <div class="mb-2 flex items-end justify-between gap-4">
          <label
            class="block font-label text-[0.6875rem] font-bold uppercase tracking-tighter text-secondary"
            >{{ t('filters.age.label') }}</label
          >
          <span class="font-mono text-sm font-bold uppercase text-primary">{{
            t('filters.age.range', { min: minAgeFilter, max: maxAgeFilter })
          }}</span>
        </div>
        <div class="relative flex items-center gap-4">
          <span class="font-mono text-[10px] font-bold text-secondary">5</span>
          <div class="relative flex h-2 w-full items-center">
            <input
              v-model.number="minAgeFilter"
              class="attendance-age-filter__input absolute z-20 w-full appearance-none bg-transparent"
              max="80"
              min="5"
              style="height: 0"
              type="range"
            />
            <input
              v-model.number="maxAgeFilter"
              class="attendance-age-filter__input absolute z-20 w-full appearance-none bg-transparent"
              max="80"
              min="5"
              style="height: 0"
              type="range"
            />
            <div class="absolute inset-x-0 h-[2px] bg-primary"></div>
          </div>
          <span class="font-mono text-[10px] font-bold text-secondary">80</span>
        </div>
        <div class="mt-6">
          <div class="flex items-center gap-4 border-b border-on-surface pb-2">
            <AppIcon class="text-primary" name="search" />
            <input
              id="attendance-search"
              v-model="searchQuery"
              class="w-full border-none bg-transparent p-0 font-mono text-lg uppercase placeholder:text-outline-variant focus:ring-0"
              :placeholder="t('search.placeholder')"
              type="text"
            />
          </div>
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
        :disabled="recoveryDecisionPending"
        :class="{
          'attendance-member-row--selected': isSelected(member.id)
        }"
        type="button"
        @click="toggleMember(member.id)"
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
            {{ t('table.age', { age: calculateAge(member.dateOfBirth) }) }}
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
          {{ t('actions.help') }}
        </p>
        <button
          class="attendance-action-button attendance-action-button--primary w-full sm:w-auto"
          :disabled="submitBlocked"
          type="button"
          @click="handleSubmit"
        >
          {{ isSubmitting ? t('actions.submitting') : t('actions.submit') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
input[type='range'] {
  -webkit-appearance: none;
  background: transparent;
}

/* What: keep the slider interaction identical to the existing members screen. Why: mobile range thumbs must stay easy to grab without introducing a second control pattern for the same filter. */
.attendance-age-filter__input {
  pointer-events: none;
}

/* What: keep Firefox thumb dragging consistent with the members roster slider. Why: the attendance filter uses the same overlapping range pattern, so both browsers need the same direct thumb hit area. */
.attendance-age-filter__input::-moz-range-thumb {
  pointer-events: auto;
}

/* What: collapse the native track visuals. Why: the slider should rely on the shared custom rail already rendered in the template, matching the members list filter. */
input[type='range']::-webkit-slider-runnable-track {
  width: 100%;
  height: 0px;
  background: transparent;
  border: none;
}

/* What: reuse the square primary thumb from the members filter. Why: attendance and members expose the same age-range interaction and should read as one consistent control across the app. */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  background: var(--color-primary);
  border: 1px solid var(--color-on-surface);
  margin-top: -8px;
  cursor: pointer;
  border-radius: 0;
}

/* What: neutralize Firefox track chrome the same way as WebKit. Why: without it, attendance would still render a browser-default rail that does not match the members screen. */
input[type='range']::-moz-range-track {
  width: 100%;
  height: 0px;
  background: transparent;
}

/* What: mirror the members thumb shape in Firefox. Why: the age slider needs identical affordance regardless of browser on the coach's device. */
input[type='range']::-moz-range-thumb {
  height: 16px;
  width: 16px;
  background: var(--color-primary);
  border: 1px solid var(--color-on-surface);
  cursor: pointer;
  border-radius: 0;
}

/* What: present draft recovery as a centered blocking dialog. Why: when a coach returns to attendance, they must explicitly decide whether to continue or replace the saved list before touching the live roster again. */
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

/* What: turn the session heading into large tap targets for date and time. Why: a mobile-first attendance flow needs edits close to the current context instead of a separate form row above the list. */
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
    "draftRecovery": {
      "title": "Masz niezapisaną listę obecności",
      "body": "Możesz wrócić do ostatniej lokalnej wersji albo ją odrzucić i zacząć nową listę dla kolejnego treningu.",
      "continue": "Wróć do listy",
      "discard": "Nowa lista"
    },
    "session": {
      "eyebrow": "Lista obecności",
      "invalid": "Uzupełnij datę i godzinę treningu",
      "changeDate": "Zmień datę treningu",
      "changeTime": "Zmień godzinę treningu"
    },
    "feedback": {
      "successTitle": "Lista zapisana",
      "success": "Zapisano obecność dla {count} osób. Możesz od razu przygotować kolejny trening."
    },
    "errors": {
      "title": "Nie udało się zapisać listy",
      "missingStart": "Uzupełnij datę i godzinę treningu przed zapisaniem listy obecności.",
      "alreadyExists": "Lista obecności dla tego terminu już istnieje. Wybierz inną godzinę treningu albo sprawdź zapisany termin.",
      "invalidStart": "Sprawdź termin treningu. Start musi być poprawną datą i nie może wykraczać dalej niż jutro.",
      "memberNotFound": "Co najmniej jeden z zaznaczonych członków nie istnieje już w zeszycie. Odśwież listę i spróbuj ponownie.",
      "submit": "Nie udało się zapisać listy obecności. Sprawdź dane i spróbuj ponownie."
    },
    "search": {
      "label": "Filtr",
      "placeholder": "Wpisz imię i nazwisko"
    },
    "fields": {
      "date": "Data treningu",
      "time": "Godzina treningu"
    },
    "filters": {
      "age": {
        "label": "Zakres wieku",
        "range": "{min} - {max} lat"
      }
    },
    "table": {
      "members": "Lista uczestników",
      "age": "Wiek {age}"
    },
    "summary": {
      "eyebrow": "Suma obecnych",
      "total": "/ {total} osób"
    },
    "actions": {
      "help": "Lista zapisuje się raz dla wybranego terminu, dlatego najpierw zaznacz pełny skład i dopiero potem potwierdź.",
      "submit": "Zapisz obecność",
      "submitting": "Zapisywanie..."
    },
    "states": {
      "loading": "Ładowanie członków...",
      "empty": "Brak zapisanych członków do zaznaczenia.",
      "noMatches": "Brak członków pasujących do filtra.",
      "loadError": "Nie udało się wczytać członków z lokalnej bazy."
    }
  },
  "en": {
    "draftRecovery": {
      "title": "You have an unsaved attendance list",
      "body": "Return to the latest local draft or discard it and start a new list for the next training session.",
      "continue": "Return to draft",
      "discard": "Start new list"
    },
    "session": {
      "eyebrow": "Attendance list",
      "invalid": "Enter the training date and time",
      "changeDate": "Change training date",
      "changeTime": "Change training time"
    },
    "feedback": {
      "successTitle": "Attendance saved",
      "success": "Attendance for {count} people was saved. You can prepare the next training session right away."
    },
    "errors": {
      "title": "Attendance could not be saved",
      "missingStart": "Enter the training date and time before saving the attendance list.",
      "alreadyExists": "An attendance list for this session already exists. Choose another training time or check the saved session.",
      "invalidStart": "Check the training start. It must be a real date and cannot be set more than one day ahead.",
      "memberNotFound": "At least one selected member no longer exists in the notebook. Refresh the list and try again.",
      "submit": "The attendance list could not be saved. Check the details and try again."
    },
    "search": {
      "label": "Filter",
      "placeholder": "Enter first and last name"
    },
    "fields": {
      "date": "Training date",
      "time": "Training time"
    },
    "filters": {
      "age": {
        "label": "Age range",
        "range": "{min} - {max} years"
      }
    },
    "table": {
      "members": "Participants",
      "age": "Age {age}"
    },
    "summary": {
      "eyebrow": "Present total",
      "total": "/ {total} people"
    },
    "actions": {
      "help": "The list is saved once for the selected session, so mark the full roster first and confirm only when it is complete.",
      "submit": "Save attendance",
      "submitting": "Saving..."
    },
    "states": {
      "loading": "Loading members...",
      "empty": "There are no saved members to mark.",
      "noMatches": "No members match the current filter.",
      "loadError": "The local member list could not be loaded."
    }
  }
}
</i18n>
