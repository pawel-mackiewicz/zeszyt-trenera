<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { ATTENDANCE_DRAFT_STORAGE_KEY } from '@/appStorageKeys'
import {
  AttendanceListAlreadyExistsError,
  InvalidAttendanceListStartError
} from '@/write/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/write/domain/model/Member'
import { useAppServices } from '@/ui/appServices'
import AttendanceSessionEditor from './AttendanceSessionEditor.vue'
import {
  snapDateToSessionTimeGrid,
  useAttendanceEditor
} from '@/ui/views/attendance/useAttendanceEditor'
import { useRouter } from '@/ui/router/runtime'

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

const router = useRouter()
const { queries, useCases } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })
const {
  activeSessionField,
  commitSessionField,
  isLoading,
  loadFailed,
  loadSavedMembers,
  maxAgeFilter,
  minAgeFilter,
  resetAttendanceSelection,
  savedMembers,
  searchQuery,
  selectedMemberIds,
  sessionDate,
  sessionStart,
  sessionTime,
  toggleMember,
  toggleSessionField
  // What: resolve attendance roster rows through the read layer. Why: this create flow should never open Dexie tables directly from UI code.
} = useAttendanceEditor(locale, () =>
  queries.listMembersForAttendanceEditor.handle()
)

const isSubmitting = ref(false)
const submitErrorKey = ref<SubmitErrorKey | null>(null)
const lastSavedCount = ref(0)
const successVisible = ref(false)
const pendingStoredDraft = ref<AttendanceDraft | null>(null)
const shouldPersistDraft = ref(false)

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
// What: expose one source of truth for when saving is unsafe from the create route. Why: the recorder must not create accidental empty sessions before the local roster is ready or while the draft recovery modal still owns the screen.
const submitBlocked = computed(
  () =>
    isLoading.value ||
    loadFailed.value ||
    isSubmitting.value ||
    recoveryDecisionPending.value
)

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
  resetAttendanceSelection(now)

  if (persistImmediately) {
    enableDraftPersistence()
    return
  }

  // What: keep "new list" as a true discard action. Why: once the coach rejects the recovered draft, localStorage should stay empty until they actually start building a replacement list.
  startPersistingDraftOnNextChange()
}

function clearSubmissionFeedback() {
  submitErrorKey.value = null
  successVisible.value = false
}

function handleToggleSessionField(field: 'date' | 'time') {
  if (recoveryDecisionPending.value) {
    return
  }

  clearSubmissionFeedback()
  toggleSessionField(field)
}

function handleCommitSessionField() {
  clearSubmissionFeedback()
  commitSessionField()
}

function handleToggleMember(memberId: string) {
  if (recoveryDecisionPending.value) {
    return
  }

  clearSubmissionFeedback()
  toggleMember(memberId)
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

function discardStoredDraft() {
  createFreshDraft(snapDateToSessionTimeGrid(new Date()), false)
}

function updateSearchQuery(value: string) {
  searchQuery.value = value
}

function updateMinAgeFilter(value: number) {
  minAgeFilter.value = value
}

function updateMaxAgeFilter(value: number) {
  maxAgeFilter.value = value
}

function updateSessionDate(value: string) {
  sessionDate.value = value
}

function updateSessionTime(value: string) {
  sessionTime.value = value
}

function resolveSubmitErrorKey(error: unknown): SubmitErrorKey {
  // What: map domain failures to screen-owned recovery copy. Why: the attendance create route is the only place that can explain how to fix a duplicate session start or stale member selection.
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
    resetAttendanceSelection(snapDateToSessionTimeGrid(new Date()))
    // What: send successful saves back to the attendance history route. Why: the create flow starts from the archive hub, so after storing one session the coach should land back on the monthly ledger with the updated result.
    await router.push('/attendance')
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
    resetAttendanceSelection(snapDateToSessionTimeGrid(new Date()))
  } else {
    // What: seed a fresh draft on the same quarter-hour cadence exposed by the picker. Why: returning to attendance without saving should bring the coach back to the same local-first work-in-progress instead of a different empty session.
    createFreshDraft()
  }

  void loadSavedMembers()
})
</script>

<template>
  <AttendanceSessionEditor
    mode="create"
    :active-session-field="activeSessionField"
    :interaction-locked="recoveryDecisionPending"
    :is-loading="isLoading"
    :is-submitting="isSubmitting"
    :load-failed="loadFailed"
    :max-age-filter="maxAgeFilter"
    :min-age-filter="minAgeFilter"
    :recovery-prompt-visible="recoveryPromptVisible"
    :saved-members="savedMembers"
    :search-query="searchQuery"
    :selected-member-ids="selectedMemberIds"
    :session-date="sessionDate"
    :session-time="sessionTime"
    :submit-blocked="submitBlocked"
    :submit-error="submitError"
    :success-message="successMessage"
    @clear-submission-feedback="clearSubmissionFeedback"
    @commit-session-field="handleCommitSessionField"
    @dismiss-submit-error="clearSubmissionFeedback"
    @discard-draft="discardStoredDraft"
    @restore-draft="restoreStoredDraft"
    @submit="handleSubmit"
    @toggle-member="handleToggleMember"
    @toggle-session-field="handleToggleSessionField"
    @update:max-age-filter="updateMaxAgeFilter"
    @update:min-age-filter="updateMinAgeFilter"
    @update:search-query="updateSearchQuery"
    @update:session-date="updateSessionDate"
    @update:session-time="updateSessionTime"
  />
</template>

<i18n lang="json">
{
  "pl": {
    "feedback": {
      "success": "Zapisano obecność dla {count} osób. Możesz od razu przygotować kolejny trening."
    },
    "errors": {
      "missingStart": "Uzupełnij datę i godzinę treningu przed zapisaniem listy obecności.",
      "alreadyExists": "Lista obecności dla tego terminu już istnieje. Wybierz inną godzinę treningu albo sprawdź zapisany termin.",
      "invalidStart": "Sprawdź termin treningu. Start musi być poprawną datą i nie może wykraczać dalej niż jutro.",
      "memberNotFound": "Co najmniej jeden z zaznaczonych członków nie istnieje już w zeszycie. Odśwież listę i spróbuj ponownie.",
      "submit": "Nie udało się zapisać listy obecności. Sprawdź dane i spróbuj ponownie."
    }
  },
  "en": {
    "feedback": {
      "success": "Attendance for {count} people was saved. You can prepare the next training session right away."
    },
    "errors": {
      "missingStart": "Enter the training date and time before saving the attendance list.",
      "alreadyExists": "An attendance list for this session already exists. Choose another training time or check the saved session.",
      "invalidStart": "Check the training start. It must be a real date and cannot be set more than one day ahead.",
      "memberNotFound": "At least one selected member no longer exists in the notebook. Refresh the list and try again.",
      "submit": "The attendance list could not be saved. Check the details and try again."
    }
  }
}
</i18n>
