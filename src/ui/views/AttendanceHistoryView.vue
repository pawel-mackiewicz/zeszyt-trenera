<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import { RouterLink } from '@/ui/router/runtime'

type AttendanceHistoryRow = {
  id: string
  start: Date
  attendanceCount: number
}

const { queries } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })

const activeMonth = ref(startOfMonth(new Date()))
const sessions = ref<AttendanceHistoryRow[]>([])
const isLoading = ref(true)
const loadFailed = ref(false)

const hasSessions = computed(() => sessions.value.length > 0)

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
        <!-- What: make each saved session row the entry into attendance editing. Why: coaches correct history by selecting the exact training they want to adjust from the monthly archive. -->
        <RouterLink
          v-for="(session, index) in sessions"
          :key="session.id"
          :to="`/attendance/${session.id}/edit`"
          class="attendance-history__row"
          :class="{
            'attendance-history__row--alt': index % 2 === 1
          }"
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
            <AppIcon name="chevron_right" />
          </p>
        </RouterLink>
      </div>
    </section>

    <!-- What: keep the add action floating above the shell navigation on every scroll position. Why: the attendance recorder needs to stay reachable from the archive view without forcing coaches to return to the bottom of a long monthly list. -->
    <div class="attendance-history__action-fab">
      <AppButton as="router-link" to="/attendance/new">
        {{ t('actions.newTraining') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.attendance-history {
  --history-panel-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  /* What: keep the floating add action from covering the last ledger rows. Why: the bottom navigation and safe-area inset take permanent space in the PWA shell, so the history content needs matching clearance. */
  padding-bottom: max(9rem, calc(5rem + env(safe-area-inset-bottom) + 5.5rem));
}

.attendance-history__action-fab {
  /* What: anchor the add action above the fixed shell navigation. Why: this screen needs one always-visible entry into the live attendance flow without changing the button’s original shape. */
  position: fixed;
  right: max(1rem, calc((100vw - 64rem) / 2 + 1.5rem));
  bottom: calc(5rem + env(safe-area-inset-bottom) + 1rem);
  z-index: 45;
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
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.8fr);
  gap: 1rem;
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
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.8fr);
  gap: 1rem;
  align-items: center;
  padding: 1.2rem 1rem;
  border-bottom: 1px solid rgba(16, 59, 55, 0.1);
  background: rgba(255, 255, 255, 0.45);
  color: inherit;
  text-decoration: none;
  transition: background-color 160ms ease;
}

.attendance-history__row--alt {
  background: rgba(243, 243, 243, 0.82);
}

.attendance-history__row:hover,
.attendance-history__row:focus-visible {
  background: color-mix(in srgb, var(--color-surface-container-low) 82%, white);
}

.attendance-history__row:focus-visible {
  outline: 2px solid rgba(174, 20, 23, 0.42);
  outline-offset: -2px;
}

.attendance-history__row:last-child {
  border-bottom: 0;
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
      "editTrainingAria": "Edytuj trening z dnia {date}, godzina {time}"
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
      "editTrainingAria": "Edit training on {date} at {time}"
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
