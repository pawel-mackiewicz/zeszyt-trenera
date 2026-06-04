<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import { RouterLink } from '@/ui/router/runtime'
import AttendanceDeleteConfirmationModal, {
  type AttendanceDeleteConfirmationModalSession
} from '@/ui/views/attendance/AttendanceDeleteConfirmationModal.vue'

type AttendanceHistoryRow = {
  id: string
  start: Date
  attendanceCount: number
}

const { queries, useCases } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })

const activeMonth = ref(startOfMonth(new Date()))
const sessions = ref<AttendanceHistoryRow[]>([])
const isLoading = ref(true)
const loadFailed = ref(false)
// What: keep destructive deletion state in the history screen. Why: the row still edits through routing, while the delete workflow needs its own confirmation and application-layer write state.
const selectedSessionForDeletion = ref<AttendanceHistoryRow | null>(null)
const isDeletingSession = ref(false)
const deleteFailed = ref(false)

const hasSessions = computed(() => sessions.value.length > 0)
const deleteConfirmationSession =
  computed<AttendanceDeleteConfirmationModalSession | null>(() => {
    const selectedSession = selectedSessionForDeletion.value

    if (selectedSession === null) {
      return null
    }

    // What: adapt the selected row into the modal's presentation contract. Why: the view keeps the application-layer delete target while the extracted modal receives only render-ready labels.
    return {
      attendanceLabel: formatAttendanceCount(selectedSession.attendanceCount),
      dateLabel: formatSessionDate(selectedSession.start),
      timeLabel: formatSessionTime(selectedSession.start)
    }
  })

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function formatSessionDate(value: Date) {
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(value)
}

function formatSessionTime(value: Date) {
  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)
}

function formatAttendanceCount(count: number) {
  return t(
    count === 1 ? 'ledger.attendanceSingle' : 'ledger.attendancePlural',
    {
      count
    }
  )
}

function openDeleteConfirmation(session: AttendanceHistoryRow) {
  deleteFailed.value = false
  // What: snapshot the row that owns the trash action. Why: the confirmation modal must show the exact training that will be removed even if the monthly list later reloads.
  selectedSessionForDeletion.value = session
}

function closeDeleteConfirmation() {
  if (isDeletingSession.value) {
    return
  }

  selectedSessionForDeletion.value = null
  deleteFailed.value = false
}

function dismissDeleteError() {
  // What: keep the failed delete retryable in place. Why: local-first writes can fail transiently and the coach should not lose the selected training context.
  deleteFailed.value = false
}

async function confirmDeleteSession() {
  const selectedSession = selectedSessionForDeletion.value

  if (selectedSession === null || isDeletingSession.value) {
    return
  }

  isDeletingSession.value = true
  deleteFailed.value = false

  try {
    // What: delete through the shared application use case. Why: attendance history must not bypass domain tombstone events or the unit-of-work boundary from the UI.
    await useCases.deleteAttendanceList.handle({
      attendanceListId: selectedSession.id
    })

    sessions.value = sessions.value.filter(
      (session) => session.id !== selectedSession.id
    )
    selectedSessionForDeletion.value = null
  } catch (error) {
    deleteFailed.value = true
    console.error('Failed to delete attendance list from history', error)
  } finally {
    isDeletingSession.value = false
  }
}

async function loadSessionsForMonth(monthStart: Date) {
  isLoading.value = true
  loadFailed.value = false

  try {
    // What: send the selected month as the full query input. Why: the view should ask the application layer for one calendar month without rebuilding storage range semantics on the UI side.
    sessions.value = await queries.listAttendanceSessionsByMonth.handle({
      month: monthStart
    })
  } catch (error) {
    loadFailed.value = true
    console.error('Failed to load attendance history for month', error)
  } finally {
    isLoading.value = false
  }
}

watch(activeMonth, (monthStart) => {
  closeDeleteConfirmation()
  void loadSessionsForMonth(monthStart)
})

onMounted(() => {
  void loadSessionsForMonth(activeMonth.value)
})
</script>

<template>
  <div class="attendance-history mx-auto max-w-5xl">
    <section
      class="attendance-history__hero mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between"
    >
      <div class="max-w-2xl">
        <h2 class="attendance-history__title">
          {{ t('hero.title') }}
        </h2>
      </div>

      <!-- What: reuse one shared month navigator across monthly archive screens. Why: the training history and payments ledgers should not drift through separate copies of the same mobile-first control. -->
      <MonthSelector v-model="activeMonth" />
    </section>

    <section class="attendance-history__panel">
      <div class="attendance-history__ledger-head" role="presentation">
        <span>{{ t('ledger.date') }}</span>
        <span>{{ t('ledger.time') }}</span>
        <span class="text-right">{{ t('ledger.attendance') }}</span>
        <span aria-hidden="true"></span>
      </div>

      <div
        v-if="isLoading"
        class="attendance-history__state attendance-history__state--loading"
      >
        {{ t('states.loading') }}
      </div>

      <div
        v-else-if="loadFailed"
        class="attendance-history__state attendance-history__state--error"
      >
        <p>{{ t('states.error') }}</p>
        <!-- What: reuse the shared secondary CTA for recovery on the history screen. Why: retry and floating add actions should stay visually aligned even though this view still owns their placement. -->
        <AppButton
          type="button"
          variant="secondary"
          @click="loadSessionsForMonth(activeMonth)"
        >
          {{ t('states.retry') }}
        </AppButton>
      </div>

      <!-- What: keep the empty state focused on archive status only. Why: the new attendance entry point belongs in the live recorder flow, so the history screen should not offer a second place to start it. -->
      <div v-else-if="!hasSessions" class="attendance-history__empty">
        <div class="attendance-history__empty-icon">
          <AppIcon name="calendar_today" />
        </div>
        <div class="attendance-history__empty-copy">
          <p class="attendance-history__empty-title">
            {{ t('states.emptyTitle') }}
          </p>
          <p class="attendance-history__empty-body">
            {{ t('states.emptyBody') }}
          </p>
        </div>
      </div>

      <div v-else class="attendance-history__rows">
        <article
          v-for="(session, index) in sessions"
          :key="session.id"
          class="attendance-history__row"
          :class="{
            'attendance-history__row--alt': index % 2 === 1
          }"
        >
          <!-- What: make the wide row surface the edit link while the trash icon is its own button. Why: coaches can still tap a training to edit it, but destructive deletion must not accidentally navigate. -->
          <RouterLink
            :to="`/attendance/${session.id}/edit`"
            class="attendance-history__row-link"
            :aria-label="
              t('actions.editTrainingAria', {
                date: formatSessionDate(session.start),
                time: formatSessionTime(session.start)
              })
            "
          >
            <p class="attendance-history__row-date">
              {{ formatSessionDate(session.start) }}
            </p>
            <p class="attendance-history__row-time">
              {{ formatSessionTime(session.start) }}
            </p>
            <p class="attendance-history__row-count">
              <span>{{ formatAttendanceCount(session.attendanceCount) }}</span>
            </p>
          </RouterLink>
          <DeleteIconButton
            :data-testid="`attendance-delete-${session.id}`"
            class="attendance-history__row-delete"
            :aria-label="
              t('actions.deleteTrainingAria', {
                date: formatSessionDate(session.start),
                time: formatSessionTime(session.start)
              })
            "
            :disabled="isDeletingSession"
            @click="openDeleteConfirmation(session)"
          />
        </article>
      </div>
    </section>

    <!-- What: render the destructive confirmation through an extracted modal. Why: this screen should keep selection and application-layer deletion while dialog behavior stays reusable and testable. -->
    <AttendanceDeleteConfirmationModal
      :has-error="deleteFailed"
      :is-pending="isDeletingSession"
      :session="deleteConfirmationSession"
      :visible="selectedSessionForDeletion !== null"
      @close="closeDeleteConfirmation"
      @confirm="confirmDeleteSession"
      @dismiss-error="dismissDeleteError"
    />

    <!-- What: keep the add action pinned to the viewport edge. Why: when the desktop history view leaves side rail space, the CTA should float outside the ledger instead of covering rows. -->
    <div class="attendance-history__action-fab app-floating-action">
      <AppButton as="router-link" to="/attendance/new">
        {{ t('actions.newTraining') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.attendance-history {
  --history-panel-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  /* What: share one desktop ledger grid between headers and rows. Why: the delete action needs reserved space without pulling "Godzina" and "Obecność" away from their matching values. */
  --attendance-history-data-columns: minmax(0, 1.4fr) minmax(0, 0.9fr)
    minmax(0, 0.8fr);
  --attendance-history-delete-column: 3rem;
  --attendance-history-column-gap: 1rem;
  /* What: keep the floating add action from covering the last ledger rows. Why: the bottom navigation and safe-area inset take permanent space in the PWA shell, so the history content needs matching clearance. */
  padding-bottom: max(9rem, calc(5rem + env(safe-area-inset-bottom) + 5.5rem));
}

.attendance-history__hero {
  position: relative;
}

/* What: give the history screen a distinct route-level identity separate from the live recorder. Why: the new attendance hub needs to read as an archive surface at a glance, especially when coaches switch between “Historia” and “Nowy trening”. */

.attendance-history__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(3.5rem, 12vw, 6rem);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.06em;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.attendance-history__panel {
  overflow: hidden;
  border: 1px solid var(--color-on-surface);
  background: rgba(249, 249, 249, 0.88);
  box-shadow: var(--history-panel-shadow);
}

.attendance-history__ledger-head {
  display: grid;
  grid-template-columns:
    var(--attendance-history-data-columns)
    var(--attendance-history-delete-column);
  gap: var(--attendance-history-column-gap);
  padding: 1rem;
  border-bottom: 2px solid var(--color-on-surface);
  background: var(--color-surface-container-low);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.attendance-history__rows {
  display: flex;
  flex-direction: column;
}

.attendance-history__row {
  display: grid;
  grid-template-columns:
    var(--attendance-history-data-columns)
    var(--attendance-history-delete-column);
  gap: var(--attendance-history-column-gap);
  align-items: stretch;
  padding: 0 1rem;
  border-bottom: 1px solid rgba(16, 59, 55, 0.1);
  background: rgba(255, 255, 255, 0.45);
  transition: background-color 160ms ease;
}

.attendance-history__row--alt {
  background: rgba(243, 243, 243, 0.82);
}

/* What: backlight the complete row surface, including the delete column. Why: hover feedback should describe one editable training entry without making the destructive action feel detached. */
.attendance-history__row:hover,
.attendance-history__row:focus-within {
  background: color-mix(in srgb, var(--color-surface-container-low) 82%, white);
}

.attendance-history__row:last-child {
  border-bottom: 0;
}

.attendance-history__row-link {
  grid-column: 1 / 4;
  display: grid;
  grid-template-columns: var(--attendance-history-data-columns);
  gap: var(--attendance-history-column-gap);
  align-items: center;
  min-width: 0;
  padding: 1.2rem 0;
  color: inherit;
  text-decoration: none;
}

.attendance-history__row-link:focus-visible {
  outline: 2px solid rgba(174, 20, 23, 0.42);
  outline-offset: -2px;
}

.attendance-history__row-delete.delete-icon-button {
  grid-column: 4;
  align-self: center;
  justify-self: center;
  background: transparent;
}

.attendance-history__row-date,
.attendance-history__row-time,
.attendance-history__row-count {
  margin: 0;
}

.attendance-history__row-date {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
}

.attendance-history__row-time {
  font-family: var(--font-mono);
  color: var(--color-secondary);
}

.attendance-history__row-count {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  font-family: var(--font-mono);
}

.attendance-history__state,
.attendance-history__empty {
  display: grid;
  gap: 1rem;
  padding: 2rem 1rem;
}

.attendance-history__state {
  justify-items: center;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.attendance-history__state--loading {
  animation: attendance-history-pulse 1.2s ease-in-out infinite;
}

.attendance-history__state--error {
  color: var(--color-error);
}

.attendance-history__empty {
  justify-items: start;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.94),
      rgba(243, 243, 243, 0.88)
    ),
    var(--color-surface);
}

.attendance-history__empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border: 1px solid var(--color-on-surface);
  background: white;
  color: var(--color-primary);
  box-shadow: var(--history-panel-shadow);
}

.attendance-history__empty-copy {
  display: grid;
  gap: 0.45rem;
}

.attendance-history__empty-title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

.attendance-history__empty-body {
  margin: 0;
  max-width: 30rem;
  color: var(--color-secondary);
  line-height: 1.6;
}

@keyframes attendance-history-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 767px) {
  .attendance-history__ledger-head {
    display: none;
  }

  /* What: collapse the ledger into stacked mobile rows. Why: the history hub has to stay glanceable on phones where three rigid columns would either overflow or shrink the date beyond recognition. */
  .attendance-history__row {
    gap: 0.5rem;
  }

  .attendance-history__row-link {
    grid-template-columns: 1fr auto;
    gap: 0.5rem 1rem;
  }

  .attendance-history__row-date {
    grid-column: 1 / -1;
    font-size: 1.05rem;
  }

  .attendance-history__row-time,
  .attendance-history__row-count {
    font-size: 0.875rem;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "hero": {
      "eyebrow": "Lokalna historia",
      "title": "Historia treningów",
      "body": "Przeglądaj zapisane treningi miesiąc po miesiącu bez mieszania trybu archiwum z żywym zapisem."
    },
    "ledger": {
      "date": "Data treningu",
      "time": "Godzina",
      "attendance": "Obecność",
      "attendanceSingle": "{count} osoba",
      "attendancePlural": "{count} osób"
    },
    "actions": {
      "newTraining": "+ DODAJ",
      "editTrainingAria": "Edytuj trening z dnia {date}, godzina {time}",
      "deleteTrainingAria": "Usuń trening z dnia {date}, godzina {time}"
    },
    "states": {
      "loading": "Ładowanie historii...",
      "error": "Nie udało się wczytać historii treningów.",
      "retry": "Spróbuj ponownie",
      "emptyTitle": "Brak treningów w tym miesiącu",
      "emptyBody": "Po zapisaniu pierwszej listy obecności trening pojawi się tutaj automatycznie w lokalnym archiwum."
    }
  },
  "en": {
    "hero": {
      "eyebrow": "Local history",
      "title": "Training history",
      "body": "Browse saved sessions month by month without mixing archive browsing with live recording."
    },
    "ledger": {
      "date": "Training date",
      "time": "Time",
      "attendance": "Attendance",
      "attendanceSingle": "{count} person",
      "attendancePlural": "{count} people"
    },
    "actions": {
      "newTraining": "+ ADD",
      "editTrainingAria": "Edit training on {date} at {time}",
      "deleteTrainingAria": "Delete training on {date} at {time}"
    },
    "states": {
      "loading": "Loading history...",
      "error": "The training history could not be loaded.",
      "retry": "Try again",
      "emptyTitle": "No sessions in this month",
      "emptyBody": "Once the first attendance list is saved, the session will appear here automatically in the local archive."
    }
  }
}
</i18n>
