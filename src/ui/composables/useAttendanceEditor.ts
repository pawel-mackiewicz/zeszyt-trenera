import { computed, ref, type Ref } from 'vue'

import { db } from '@/db'
import type { PersistedMember } from '@/infra'
import { AGE_FILTER_MAX, AGE_FILTER_MIN } from '@/ui/utils/ageRange'

export type SessionField = 'date' | 'time'

export const SESSION_TIME_STEP_MINUTES = 15
export const SESSION_TIME_STEP_SECONDS = SESSION_TIME_STEP_MINUTES * 60

export function toDateInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function toTimeInputValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

export function snapDateToSessionTimeGrid(value: Date): Date {
  const snappedValue = new Date(value)
  const minutes = snappedValue.getMinutes()
  const roundedMinutes =
    Math.round(minutes / SESSION_TIME_STEP_MINUTES) * SESSION_TIME_STEP_MINUTES

  snappedValue.setSeconds(0, 0)
  snappedValue.setMinutes(roundedMinutes)

  return snappedValue
}

export function snapTimeInputToSessionGrid(value: string): string {
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

  // Why: manual time edits still need to land on the same 15-minute cadence as the mobile picker so saved sessions never drift off the visible grid.
  return toTimeInputValue(
    snapDateToSessionTimeGrid(new Date(2000, 0, 1, hours, minutes))
  )
}

export function buildSessionStart(
  sessionDate: string,
  sessionTime: string
): Date | null {
  if (!sessionDate || !sessionTime) {
    return null
  }

  const [year, month, day] = sessionDate.split('-').map(Number)
  const [hours, minutes] = sessionTime.split(':').map(Number)
  const start = new Date(year, month - 1, day, hours, minutes)

  return Number.isNaN(start.getTime()) ? null : start
}

export function useAttendanceEditor(locale: Ref<string>) {
  const savedMembers = ref<PersistedMember[]>([])
  const isLoading = ref(true)
  const loadFailed = ref(false)
  const searchQuery = ref('')
  const maxAgeFilter = ref(AGE_FILTER_MAX)
  const minAgeFilter = ref(AGE_FILTER_MIN)
  const selectedMemberIds = ref<string[]>([])
  const sessionDate = ref('')
  const sessionTime = ref('')
  const activeSessionField = ref<SessionField | null>(null)
  const sessionStart = computed(() =>
    buildSessionStart(sessionDate.value, sessionTime.value)
  )

  async function loadSavedMembers() {
    isLoading.value = true
    loadFailed.value = false

    try {
      await db.open()
      const members = await db.members.toArray()

      // What: sort the attendance roster alphabetically before either create or edit renders. Why: both flows are phone-first find-and-toggle screens, so they need one stable scanning order.
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

  function resetAttendanceSelection(now = new Date()) {
    selectedMemberIds.value = []
    sessionDate.value = toDateInputValue(now)
    sessionTime.value = toTimeInputValue(now)
    activeSessionField.value = null
  }

  function applyAttendanceSession(start: Date, memberIds: string[]) {
    selectedMemberIds.value = [...new Set(memberIds)]
    sessionDate.value = toDateInputValue(start)
    sessionTime.value = toTimeInputValue(start)
    activeSessionField.value = null
  }

  function toggleSessionField(field: SessionField) {
    activeSessionField.value = activeSessionField.value === field ? null : field
  }

  function commitSessionField() {
    if (activeSessionField.value === 'time') {
      sessionTime.value = snapTimeInputToSessionGrid(sessionTime.value)
    }

    activeSessionField.value = null
  }

  function isSelected(memberId: string) {
    return selectedMemberIds.value.includes(memberId)
  }

  function toggleMember(memberId: string) {
    if (isSelected(memberId)) {
      selectedMemberIds.value = selectedMemberIds.value.filter(
        (savedMemberId) => savedMemberId !== memberId
      )
      return
    }

    selectedMemberIds.value = [...selectedMemberIds.value, memberId]
  }

  return {
    activeSessionField,
    applyAttendanceSession,
    commitSessionField,
    isLoading,
    isSelected,
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
  }
}
