<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  AttendanceListAlreadyExistsError,
  AttendanceListNotFoundError,
  InvalidAttendanceListStartError
} from '@/write/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/write/domain/model/Member'
import { useAppServices } from '@/ui/appServices'
import AttendanceSessionEditor from '@/ui/components/AttendanceSessionEditor.vue'
import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { useAttendanceEditor } from '@/ui/composables/useAttendanceEditor'
import { useRoute, useRouter } from '@/ui/router/runtime'

type SubmitErrorKey =
  | 'missingStart'
  | 'notFound'
  | 'alreadyExists'
  | 'invalidStart'
  | 'memberNotFound'
  | 'submit'

const route = useRoute()
const router = useRouter()
const { queries, useCases } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })
const {
  activeSessionField,
  applyAttendanceSession,
  commitSessionField,
  isLoading: isMembersLoading,
  loadFailed: membersLoadFailed,
  loadSavedMembers,
  maxAgeFilter,
  minAgeFilter,
  savedMembers,
  searchQuery,
  selectedMemberIds,
  sessionDate,
  sessionStart,
  sessionTime,
  toggleMember,
  toggleSessionField
  // What: resolve attendance roster rows through the read layer. Why: edit hydration should stay on application read contracts instead of touching Dexie in UI code.
} = useAttendanceEditor(locale, () =>
  queries.listMembersForAttendanceEditor.handle()
)

const isSessionLoading = ref(true)
const sessionLoadFailed = ref(false)
const sessionMissing = ref(false)
const isSubmitting = ref(false)
const submitErrorKey = ref<SubmitErrorKey | null>(null)

const attendanceListId = computed(() =>
  typeof route.params.attendanceListId === 'string'
    ? route.params.attendanceListId
    : ''
)
const isLoading = computed(
  () => isMembersLoading.value || isSessionLoading.value
)
const showEditor = computed(
  () => !sessionLoadFailed.value && !sessionMissing.value
)
const loadErrorMessage = computed(() => {
  if (sessionMissing.value) {
    return t('states.missing')
  }

  return sessionLoadFailed.value ? t('states.loadError') : ''
})
const submitError = computed(() =>
  submitErrorKey.value === null ? '' : t(`errors.${submitErrorKey.value}`)
)
const submitBlocked = computed(
  () =>
    isLoading.value ||
    membersLoadFailed.value ||
    sessionLoadFailed.value ||
    sessionMissing.value ||
    isSubmitting.value
)

function clearLoadedAttendanceSession() {
  selectedMemberIds.value = []
  sessionDate.value = ''
  sessionTime.value = ''
  activeSessionField.value = null
}

function clearSubmissionFeedback() {
  submitErrorKey.value = null
}

function handleToggleSessionField(field: 'date' | 'time') {
  clearSubmissionFeedback()
  toggleSessionField(field)
}

function handleCommitSessionField() {
  clearSubmissionFeedback()
  commitSessionField()
}

function handleToggleMember(memberId: string) {
  clearSubmissionFeedback()
  toggleMember(memberId)
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
  // What: map edit failures to route-owned recovery copy. Why: only the attendance edit screen can explain whether the saved session disappeared, conflicted with another start, or lost a selected member.
  if (error instanceof AttendanceListNotFoundError) {
    return 'notFound'
  }

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

async function loadAttendanceSession() {
  isSessionLoading.value = true
  sessionLoadFailed.value = false
  sessionMissing.value = false
  clearSubmissionFeedback()
  clearLoadedAttendanceSession()

  try {
    if (!attendanceListId.value) {
      sessionMissing.value = true
      return
    }

    const attendanceSession = await queries.getAttendanceSessionById.handle({
      attendanceListId: attendanceListId.value
    })

    if (!attendanceSession) {
      sessionMissing.value = true
      return
    }

    applyAttendanceSession(attendanceSession.start, attendanceSession.memberIds)
  } catch (error) {
    sessionLoadFailed.value = true
    console.error('Failed to load attendance session for editing', error)
  } finally {
    isSessionLoading.value = false
  }
}

async function handleSubmit() {
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
    await useCases.updateAttendanceList.handle({
      attendanceListId: attendanceListId.value,
      memberIds: selectedMemberIds.value,
      start
    })

    // What: return successful edits to the history route. Why: coaches enter this screen from the archive, so the most useful post-save destination is the updated monthly ledger.
    await router.replace('/attendance')
  } catch (error) {
    submitErrorKey.value = resolveSubmitErrorKey(error)
  } finally {
    isSubmitting.value = false
  }
}

watch(
  attendanceListId,
  () => {
    void loadAttendanceSession()
  },
  { immediate: true }
)

onMounted(() => {
  void loadSavedMembers()
})
</script>

<template>
  <AttendanceSessionEditor
    v-if="showEditor"
    mode="edit"
    :active-session-field="activeSessionField"
    :is-loading="isLoading"
    :is-submitting="isSubmitting"
    :load-failed="membersLoadFailed"
    :max-age-filter="maxAgeFilter"
    :min-age-filter="minAgeFilter"
    :saved-members="savedMembers"
    :search-query="searchQuery"
    :selected-member-ids="selectedMemberIds"
    :session-date="sessionDate"
    :session-time="sessionTime"
    :submit-blocked="submitBlocked"
    :submit-error="submitError"
    success-message=""
    @clear-submission-feedback="clearSubmissionFeedback"
    @commit-session-field="handleCommitSessionField"
    @dismiss-submit-error="clearSubmissionFeedback"
    @submit="handleSubmit"
    @toggle-member="handleToggleMember"
    @toggle-session-field="handleToggleSessionField"
    @update:max-age-filter="updateMaxAgeFilter"
    @update:min-age-filter="updateMinAgeFilter"
    @update:search-query="updateSearchQuery"
    @update:session-date="updateSessionDate"
    @update:session-time="updateSessionTime"
  />

  <div v-else class="mx-auto max-w-4xl pt-4 pb-12">
    <section class="border border-on-surface bg-surface px-5 py-6 hard-shadow">
      <!-- What: keep edit-load failures on the shared floating alert surface. Why: even non-dismissable recovery errors should read from the same top-level location as the rest of the app so coaches know where to look first. -->
      <FloatingErrorAlert
        :dismissible="false"
        :message="loadErrorMessage"
        :title="t('states.title')"
        top-offset="shell"
      />
      <div class="mt-4 flex justify-start">
        <!-- What: keep recovery on the shared button primitive. Why: a broken edit target should still hand the coach back to the attendance history through the same route-aware control language as the rest of the shell. -->
        <AppButton as="router-link" to="/attendance">
          {{ t('actions.back') }}
        </AppButton>
      </div>
    </section>
  </div>
</template>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "back": "Wróć do historii"
    },
    "errors": {
      "missingStart": "Uzupełnij datę i godzinę treningu przed zapisaniem zmian.",
      "notFound": "Ten trening nie istnieje już w historii. Wróć do archiwum i wybierz inny zapis.",
      "alreadyExists": "Lista obecności dla tego terminu już istnieje. Wybierz inną godzinę treningu albo wróć do zapisanego terminu.",
      "invalidStart": "Sprawdź termin treningu. Start musi być poprawną datą i nie może wykraczać dalej niż jutro.",
      "memberNotFound": "Co najmniej jeden z zaznaczonych członków nie istnieje już w zeszycie. Odśwież listę i spróbuj ponownie.",
      "submit": "Nie udało się zapisać zmian w liście obecności. Sprawdź dane i spróbuj ponownie."
    },
    "states": {
      "title": "Nie można otworzyć treningu",
      "loadError": "Nie udało się wczytać zapisanego treningu z lokalnego archiwum.",
      "missing": "Wybrany trening nie istnieje już w historii."
    }
  },
  "en": {
    "actions": {
      "back": "Back to history"
    },
    "errors": {
      "missingStart": "Enter the training date and time before saving the changes.",
      "notFound": "This training session no longer exists in history. Return to the archive and choose another saved session.",
      "alreadyExists": "An attendance list for this session already exists. Choose another training time or return to the saved session.",
      "invalidStart": "Check the training start. It must be a real date and cannot be set more than one day ahead.",
      "memberNotFound": "At least one selected member no longer exists in the notebook. Refresh the list and try again.",
      "submit": "The attendance changes could not be saved. Check the details and try again."
    },
    "states": {
      "title": "This training session cannot be opened",
      "loadError": "The saved training session could not be loaded from the local archive.",
      "missing": "The selected training session no longer exists in history."
    }
  }
}
</i18n>
