<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  MembershipPaymentAlreadyExistsError,
  toMembershipPaymentCoveredMonth
} from '@/domain/model/MembershipPayment'
import type {
  MembershipPaymentStatusByMonthResult,
  MembershipPaymentStatusMemberListItem,
  UnpaidAttendedMembershipPaymentStatusMemberListItem
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { useAppServices } from '@/ui/appServices'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  calculateAge,
  matchesAgeRange
} from '@/ui/utils/ageRange'

type ObservableSubscription = {
  unsubscribe(): void
}

type ConfirmationErrorKey = 'submit' | null

type PaymentFeedback = {
  kind: 'alreadyRecorded'
  memberName: string
  coveredMonthLabel: string
} | null

type ConfirmPaymentTarget = MembershipPaymentStatusMemberListItem & {
  attendanceCount: number
  coveredMonth: string
  coveredMonthLabel: string
}

const { queries, useCases } = useAppServices()
const { t, locale } = useI18n({ useScope: 'local' })

const activeMonth = ref(startOfMonth(new Date()))
const searchQuery = ref('')
const minAgeFilter = ref(AGE_FILTER_MIN)
const maxAgeFilter = ref(AGE_FILTER_MAX)
const isLoading = ref(true)
const loadFailed = ref(false)
const result = ref<MembershipPaymentStatusByMonthResult>({
  paidMembers: [],
  unpaidAbsentMembers: [],
  unpaidAttendedMembers: []
})
const paymentFeedback = ref<PaymentFeedback>(null)
const selectedMemberForConfirmation = ref<ConfirmPaymentTarget | null>(null)
const confirmationErrorKey = ref<ConfirmationErrorKey>(null)
const isConfirmingPayment = ref(false)

let paymentsSubscription: ObservableSubscription | null = null

const searchValue = computed(() => searchQuery.value.trim().toLowerCase())
const sourceMemberCount = computed(
  () =>
    result.value.paidMembers.length +
    result.value.unpaidAbsentMembers.length +
    result.value.unpaidAttendedMembers.length
)
const filteredUnpaidAttendedMembers = computed(() =>
  filterAndSortUnpaidAttendedMembers(result.value.unpaidAttendedMembers)
)
const filteredUnpaidAbsentMembers = computed(() =>
  filterAndSortMembers(result.value.unpaidAbsentMembers)
)
const filteredPaidMembers = computed(() =>
  filterAndSortMembers(result.value.paidMembers)
)
const visibleMemberCount = computed(
  () =>
    filteredPaidMembers.value.length +
    filteredUnpaidAbsentMembers.value.length +
    filteredUnpaidAttendedMembers.value.length
)
const confirmationError = computed(() =>
  confirmationErrorKey.value === null
    ? ''
    : t(`confirmation.errors.${confirmationErrorKey.value}`)
)
const feedbackMessage = computed(() => {
  if (paymentFeedback.value === null) {
    return ''
  }

  return t(`feedback.${paymentFeedback.value.kind}`, {
    memberName: paymentFeedback.value.memberName,
    month: paymentFeedback.value.coveredMonthLabel
  })
})

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function formatMonth(value: Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric'
  }).format(value)
}

function formatMemberName(
  member: MembershipPaymentStatusMemberListItem
): string {
  return `${member.firstName} ${member.lastName}`
}

function formatAge(member: MembershipPaymentStatusMemberListItem): string {
  const age = calculateAge(member.dateOfBirth)

  return age === null ? t('table.ageUnknown') : t('table.age', { age })
}

function matchesMemberFilters(
  member: MembershipPaymentStatusMemberListItem
): boolean {
  const fullName = formatMemberName(member).toLowerCase()
  const matchesSearch =
    searchValue.value.length === 0 || fullName.includes(searchValue.value)

  if (!matchesSearch) {
    return false
  }

  return matchesAgeRange(
    member.dateOfBirth,
    minAgeFilter.value,
    maxAgeFilter.value
  )
}

function sortMembers<T extends MembershipPaymentStatusMemberListItem>(
  members: T[]
): T[] {
  return [...members].sort((left, right) =>
    formatMemberName(left).localeCompare(formatMemberName(right), locale.value)
  )
}

function filterAndSortMembers<T extends MembershipPaymentStatusMemberListItem>(
  members: T[]
): T[] {
  return sortMembers(members.filter(matchesMemberFilters))
}

function filterAndSortUnpaidAttendedMembers(
  members: UnpaidAttendedMembershipPaymentStatusMemberListItem[]
) {
  return filterAndSortMembers(members)
}

function clearConfirmationDialog() {
  selectedMemberForConfirmation.value = null
  confirmationErrorKey.value = null
}

function closeConfirmationDialog() {
  if (isConfirmingPayment.value) {
    return
  }

  clearConfirmationDialog()
}

function unsubscribePaymentsLedger() {
  paymentsSubscription?.unsubscribe()
  paymentsSubscription = null
}

function subscribeToPaymentsLedger(monthStart: Date) {
  unsubscribePaymentsLedger()
  isLoading.value = true
  loadFailed.value = false

  // What: keep the payments screen attached to one app-level live read. Why: the monthly ledger should react to offline writes without the view touching Dexie tables directly.
  paymentsSubscription = queries.observeMembershipPaymentStatusByMonth
    .handle({
      month: monthStart
    })
    .subscribe({
      next(nextResult) {
        result.value = nextResult
        isLoading.value = false
        loadFailed.value = false
      },
      error(error) {
        loadFailed.value = true
        isLoading.value = false
        console.error('Failed to load membership payments for month', error)
      }
    })
}

function handleMonthChange(month: Date) {
  // What: reset month-specific UI state before swapping the shared selector value. Why: payment feedback and confirmation copy belong to one covered month and must not leak into the next ledger.
  paymentFeedback.value = null
  closeConfirmationDialog()
  activeMonth.value = month
}

function retryLoading() {
  subscribeToPaymentsLedger(activeMonth.value)
}

function openPaymentConfirmation(
  member: MembershipPaymentStatusMemberListItem,
  attendanceCount = 0
) {
  paymentFeedback.value = null
  confirmationErrorKey.value = null

  // What: snapshot the selected member together with the visible month label. Why: the confirmation dialog must show exactly what will be persisted even if the screen state changes afterward.
  selectedMemberForConfirmation.value = {
    ...member,
    attendanceCount,
    coveredMonth: toMembershipPaymentCoveredMonth(activeMonth.value),
    coveredMonthLabel: formatMonth(activeMonth.value)
  }
}

async function confirmPayment() {
  const selectedMember = selectedMemberForConfirmation.value

  if (!selectedMember) {
    return
  }

  isConfirmingPayment.value = true
  confirmationErrorKey.value = null

  try {
    await useCases.registerMembershipPayment.handle({
      memberId: selectedMember.id,
      coveredMonth: selectedMember.coveredMonth
    })

    clearConfirmationDialog()
  } catch (error) {
    if (error instanceof MembershipPaymentAlreadyExistsError) {
      paymentFeedback.value = {
        kind: 'alreadyRecorded',
        memberName: formatMemberName(selectedMember),
        coveredMonthLabel: selectedMember.coveredMonthLabel
      }
      clearConfirmationDialog()
    } else {
      confirmationErrorKey.value = 'submit'
    }
  } finally {
    isConfirmingPayment.value = false
  }
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || selectedMemberForConfirmation.value === null) {
    return
  }

  closeConfirmationDialog()
}

watch(
  activeMonth,
  (monthStart) => {
    subscribeToPaymentsLedger(monthStart)
  },
  {
    immediate: true
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  unsubscribePaymentsLedger()
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <div class="payments-view mx-auto max-w-5xl">
    <section class="payments-view__hero">
      <div class="payments-view__title-block">
        <p class="payments-view__eyebrow">{{ t('hero.eyebrow') }}</p>
        <h2 class="payments-view__title">{{ t('hero.title') }}</h2>
      </div>

      <!-- What: reuse the shared month navigator from attendance history. Why: both monthly ledgers should move through time with one consistent mobile-first control and one accessibility contract. -->
      <MonthSelector
        :model-value="activeMonth"
        @update:model-value="handleMonthChange"
      />
    </section>

    <section class="payments-view__filters">
      <!-- What: reuse the shared compact roster search inside the payments filters. Why: the monthly ledger should feel like the same mobile-first member search flow as attendance and members. -->
      <SearchBar
        v-model="searchQuery"
        input-id="payments-search"
        :input-label="t('search.label')"
        :placeholder="t('search.placeholder')"
      />

      <AgeRangeFilter
        v-model:min-value="minAgeFilter"
        v-model:max-value="maxAgeFilter"
        :max-bound="AGE_FILTER_MAX"
        :min-bound="AGE_FILTER_MIN"
      />
    </section>

    <div v-if="feedbackMessage" class="mb-6">
      <div class="message-banner message-banner--danger">
        <strong>{{ t('feedback.title') }}</strong>
        <span>{{ feedbackMessage }}</span>
      </div>
    </div>

    <section
      v-if="isLoading"
      class="payments-view__state payments-view__state--loading"
    >
      {{ t('states.loading') }}
    </section>

    <section
      v-else-if="loadFailed"
      class="payments-view__state payments-view__state--error"
    >
      <p>{{ t('states.error') }}</p>
      <button
        class="payments-action-button"
        type="button"
        @click="retryLoading"
      >
        {{ t('states.retry') }}
      </button>
    </section>

    <section
      v-else-if="sourceMemberCount === 0"
      class="payments-view__empty-card"
    >
      <p class="payments-view__empty-title">{{ t('states.emptyTitle') }}</p>
      <p class="payments-view__empty-body">{{ t('states.emptyBody') }}</p>
    </section>

    <section
      v-else-if="visibleMemberCount === 0"
      class="payments-view__empty-card"
    >
      <p class="payments-view__empty-title">{{ t('states.noMatchesTitle') }}</p>
      <p class="payments-view__empty-body">{{ t('states.noMatchesBody') }}</p>
    </section>

    <div v-else class="payments-view__sections">
      <section class="payments-section">
        <div class="payments-section__header">
          <div class="payments-section__badge payments-section__badge--hot">
            {{ t('sections.unpaidAttended.title') }}
          </div>
          <div class="payments-section__line"></div>
        </div>

        <div
          v-if="filteredUnpaidAttendedMembers.length === 0"
          class="payments-section__empty"
        >
          {{ t('sections.unpaidAttended.empty') }}
        </div>

        <template v-else>
          <article
            v-for="member in filteredUnpaidAttendedMembers"
            :key="member.id"
            class="payments-row payments-row--urgent"
          >
            <div class="payments-row__copy">
              <div class="payments-row__headline">
                <p class="payments-row__name">
                  {{ formatMemberName(member) }}
                </p>
                <span class="payments-row__badge">
                  {{
                    t('table.attendanceBadge', {
                      count: member.attendanceSessionIds.length
                    })
                  }}
                </span>
              </div>
              <p class="payments-row__meta">{{ formatAge(member) }}</p>
            </div>

            <button
              :id="`payments-open-confirm-${member.id}`"
              class="payments-action-button payments-action-button--primary"
              type="button"
              @click="
                openPaymentConfirmation(
                  member,
                  member.attendanceSessionIds.length
                )
              "
            >
              {{ t('actions.markAsPaid') }}
            </button>
          </article>
        </template>
      </section>

      <section class="payments-section">
        <div class="payments-section__header">
          <div class="payments-section__badge payments-section__badge--muted">
            {{ t('sections.unpaidAbsent.title') }}
          </div>
          <div
            class="payments-section__line payments-section__line--soft"
          ></div>
        </div>

        <div
          v-if="filteredUnpaidAbsentMembers.length === 0"
          class="payments-section__empty"
        >
          {{ t('sections.unpaidAbsent.empty') }}
        </div>

        <template v-else>
          <article
            v-for="member in filteredUnpaidAbsentMembers"
            :key="member.id"
            class="payments-row payments-row--quiet"
          >
            <div class="payments-row__copy">
              <p class="payments-row__name">
                {{ formatMemberName(member) }}
              </p>
              <p class="payments-row__meta">{{ formatAge(member) }}</p>
            </div>

            <button
              :id="`payments-open-confirm-${member.id}`"
              class="payments-action-button"
              type="button"
              @click="openPaymentConfirmation(member)"
            >
              {{ t('actions.markAsPaid') }}
            </button>
          </article>
        </template>
      </section>

      <section class="payments-section">
        <div class="payments-section__header">
          <div class="payments-section__badge payments-section__badge--dark">
            {{ t('sections.paid.title') }}
          </div>
          <div
            class="payments-section__line payments-section__line--soft"
          ></div>
        </div>

        <div
          v-if="filteredPaidMembers.length === 0"
          class="payments-section__empty"
        >
          {{ t('sections.paid.empty') }}
        </div>

        <template v-else>
          <article
            v-for="member in filteredPaidMembers"
            :key="member.id"
            class="payments-row payments-row--paid"
          >
            <div class="payments-row__copy">
              <p class="payments-row__name">
                {{ formatMemberName(member) }}
              </p>
              <p class="payments-row__meta">{{ formatAge(member) }}</p>
            </div>

            <span class="payments-row__paid-indicator">
              <AppIcon name="check_circle" />
              <span>{{ t('table.paid') }}</span>
            </span>
          </article>
        </template>
      </section>
    </div>

    <Transition name="payments-overlay">
      <div v-if="selectedMemberForConfirmation" class="payments-confirmation">
        <div
          class="payments-confirmation__backdrop"
          @click="closeConfirmationDialog"
        ></div>
        <section
          aria-labelledby="payments-confirmation-title"
          aria-modal="true"
          class="payments-confirmation__dialog"
          role="dialog"
        >
          <p class="payments-confirmation__eyebrow">
            {{ t('confirmation.eyebrow') }}
          </p>
          <h3
            id="payments-confirmation-title"
            class="payments-confirmation__title"
          >
            {{ t('confirmation.title') }}
          </h3>
          <p class="payments-confirmation__copy">
            {{
              t('confirmation.body', {
                memberName: formatMemberName(selectedMemberForConfirmation),
                month: selectedMemberForConfirmation.coveredMonthLabel
              })
            }}
          </p>

          <dl class="payments-confirmation__details">
            <div class="payments-confirmation__detail">
              <dt>{{ t('confirmation.memberLabel') }}</dt>
              <dd>{{ formatMemberName(selectedMemberForConfirmation) }}</dd>
            </div>
            <div class="payments-confirmation__detail">
              <dt>{{ t('confirmation.monthLabel') }}</dt>
              <dd>{{ selectedMemberForConfirmation.coveredMonthLabel }}</dd>
            </div>
            <div class="payments-confirmation__detail">
              <dt>{{ t('confirmation.ageLabel') }}</dt>
              <dd>{{ formatAge(selectedMemberForConfirmation) }}</dd>
            </div>
            <div
              v-if="selectedMemberForConfirmation.attendanceCount > 0"
              class="payments-confirmation__detail"
            >
              <dt>{{ t('confirmation.attendanceLabel') }}</dt>
              <dd>
                {{
                  t('confirmation.attendanceValue', {
                    count: selectedMemberForConfirmation.attendanceCount
                  })
                }}
              </dd>
            </div>
          </dl>

          <div
            v-if="confirmationError"
            class="message-banner message-banner--danger"
          >
            <strong>{{ t('confirmation.errors.title') }}</strong>
            <span>{{ confirmationError }}</span>
          </div>

          <div class="payments-confirmation__actions">
            <button
              class="payments-action-button payments-action-button--primary"
              :disabled="isConfirmingPayment"
              type="button"
              @click="confirmPayment"
            >
              {{
                isConfirmingPayment
                  ? t('actions.confirmingPayment')
                  : t('actions.confirmPayment')
              }}
            </button>
            <button
              class="payments-action-button"
              :disabled="isConfirmingPayment"
              type="button"
              @click="closeConfirmationDialog"
            >
              {{ t('actions.cancel') }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
input[type='range'] {
  -webkit-appearance: none;
  background: transparent;
}

.payments-view {
  --payments-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  --payments-surface: rgba(255, 255, 255, 0.82);
  /* What: keep the last payment rows visible above the shell navigation. Why: the monthly ledger is a long-scrolling PWA screen and the fixed bottom nav permanently occupies the lower viewport edge. */
  padding-bottom: max(8.5rem, calc(5rem + env(safe-area-inset-bottom) + 4rem));
}

.payments-view__hero {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.payments-view__title-block {
  display: grid;
  gap: 0.5rem;
}

.payments-view__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.payments-view__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3.4rem, 13vw, 6.8rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
  text-transform: uppercase;
  color: var(--ink);
}

.payments-view__filters,
.payments-section,
.payments-view__empty-card,
.payments-view__state,
.payments-confirmation__dialog {
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: var(--payments-surface);
  box-shadow: var(--payments-shadow);
  backdrop-filter: blur(10px);
}

.payments-view__filters {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.1rem 1.1rem 1.25rem;
}

.payments-view__sections {
  display: grid;
  gap: 1.5rem;
}

.payments-section {
  display: grid;
  gap: 0;
  overflow: hidden;
}

.payments-section__header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1rem 0;
}

.payments-section__badge {
  padding: 0.42rem 0.7rem;
  border: 1px solid var(--ink);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.payments-section__badge--hot {
  background: var(--accent-hot);
  color: white;
}

.payments-section__badge--muted {
  background: white;
  color: var(--ink);
}

.payments-section__badge--dark {
  background: var(--ink);
  color: white;
}

.payments-section__line {
  flex: 1;
  height: 1px;
  background: rgba(16, 59, 55, 0.22);
}

.payments-section__line--soft {
  opacity: 0.45;
}

.payments-section__empty {
  padding: 1.25rem 1rem 1.35rem;
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  text-transform: uppercase;
}

.payments-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid rgba(16, 59, 55, 0.08);
}

.payments-row--urgent {
  background: linear-gradient(
    135deg,
    rgba(255, 244, 240, 0.9),
    rgba(255, 255, 255, 0.88)
  );
}

.payments-row--quiet {
  background: rgba(255, 255, 255, 0.52);
}

.payments-row--paid {
  background: linear-gradient(
    135deg,
    rgba(232, 250, 242, 0.92),
    rgba(255, 255, 255, 0.88)
  );
}

.payments-row__copy {
  min-width: 0;
  display: grid;
  gap: 0.45rem;
}

.payments-row__headline {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.payments-row__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--ink);
}

.payments-row__badge,
.payments-row__meta,
.payments-row__paid-indicator {
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.payments-row__badge {
  color: var(--accent-hot);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.payments-row__meta {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.1em;
}

.payments-row__paid-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--success);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.payments-row__paid-indicator :deep(.app-icon) {
  width: 1.35rem;
  height: 1.35rem;
}

.payments-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1rem;
  border: 1px solid var(--ink);
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 75ms ease,
    color 75ms ease;
}

.payments-action-button:hover,
.payments-action-button:focus-visible {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.payments-action-button:disabled {
  opacity: 0.6;
  cursor: wait;
  transform: none;
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}

.payments-action-button--primary {
  background: linear-gradient(135deg, var(--accent-hot), rgba(161, 63, 48, 1));
  color: white;
}

.payments-view__state,
.payments-view__empty-card {
  display: grid;
  gap: 1rem;
  justify-items: start;
  padding: 1.4rem 1.2rem;
}

.payments-view__state--loading {
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.payments-view__state--error {
  color: var(--danger);
}

.payments-view__empty-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--ink);
}

.payments-view__empty-body {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.payments-confirmation {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: end;
  justify-content: center;
  padding: 1rem;
}

.payments-confirmation__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(17, 41, 39, 0.45);
  backdrop-filter: blur(3px);
}

.payments-confirmation__dialog {
  position: relative;
  width: min(100%, 32rem);
  display: grid;
  gap: 1rem;
  padding: 1.35rem;
}

.payments-confirmation__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.payments-confirmation__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 7vw, 2.4rem);
  line-height: 0.96;
  text-transform: uppercase;
  color: var(--ink);
}

.payments-confirmation__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.55;
}

.payments-confirmation__details {
  display: grid;
  gap: 0.85rem;
  margin: 0;
}

.payments-confirmation__detail {
  display: grid;
  gap: 0.22rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid rgba(16, 59, 55, 0.08);
  background: rgba(255, 255, 255, 0.7);
}

.payments-confirmation__detail dt {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.payments-confirmation__detail dd {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink);
}

.payments-confirmation__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.payments-overlay-enter-active,
.payments-overlay-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.payments-overlay-enter-from,
.payments-overlay-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (min-width: 720px) {
  .payments-view__hero {
    flex-direction: row;
    align-items: end;
    justify-content: space-between;
  }

  .payments-view__filters {
    grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
    align-items: end;
  }

  .payments-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .payments-confirmation {
    align-items: center;
  }

  .payments-confirmation__actions {
    flex-direction: row;
    justify-content: end;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "hero": {
      "eyebrow": "Miesięczny status składek",
      "title": "Płatności"
    },
    "search": {
      "label": "Szukaj członka",
      "placeholder": "Wpisz imię i nazwisko"
    },
    "actions": {
      "markAsPaid": "Oznacz jako opłacone",
      "confirmPayment": "Potwierdź płatność",
      "confirmingPayment": "Zapisywanie...",
      "cancel": "Anuluj"
    },
    "sections": {
      "unpaidAttended": {
        "title": "Nieopłacone i obecni",
        "empty": "Brak nieopłaconych osób z obecnościami w tym miesiącu."
      },
      "unpaidAbsent": {
        "title": "Nieopłacone i nieobecni",
        "empty": "Brak nieopłaconych nieobecnych w tym miesiącu."
      },
      "paid": {
        "title": "Opłacone",
        "empty": "Brak opłaconych osób w tym miesiącu."
      }
    },
    "table": {
      "attendanceBadge": "{count} TR.",
      "age": "{age} lat",
      "ageUnknown": "Wiek nieznany",
      "paid": "Opłacone"
    },
    "states": {
      "loading": "Ładowanie płatności",
      "error": "Nie udało się wczytać miesięcznego statusu płatności.",
      "retry": "Spróbuj ponownie",
      "emptyTitle": "Brak członków do rozliczenia",
      "emptyBody": "Dodaj członków, a miesięczny status składek pojawi się tutaj automatycznie.",
      "noMatchesTitle": "Brak wyników dla tego filtra",
      "noMatchesBody": "Rozszerz zakres wieku albo zmień wyszukiwane imię i nazwisko."
    },
    "feedback": {
      "title": "Status już zaktualizowany",
      "alreadyRecorded": "Płatność od {memberName} za {month} jest już zapisana."
    },
    "confirmation": {
      "eyebrow": "Potwierdzenie",
      "title": "Oznaczyć składkę jako opłaconą?",
      "body": "Czy odebrano płatność od {memberName} za {month}?",
      "memberLabel": "Członek",
      "monthLabel": "Miesiąc",
      "ageLabel": "Wiek",
      "attendanceLabel": "Obecności",
      "attendanceValue": "{count} treningi w tym miesiącu",
      "errors": {
        "title": "Nie udało się zapisać płatności",
        "submit": "Spróbuj ponownie. Ten ekran nie zapisał jeszcze zmiany."
      }
    }
  },
  "en": {
    "hero": {
      "eyebrow": "Monthly membership ledger",
      "title": "Payments"
    },
    "search": {
      "label": "Search member",
      "placeholder": "Type first and last name"
    },
    "actions": {
      "markAsPaid": "Mark as paid",
      "confirmPayment": "Confirm payment",
      "confirmingPayment": "Saving...",
      "cancel": "Cancel"
    },
    "sections": {
      "unpaidAttended": {
        "title": "Unpaid and attended",
        "empty": "No unpaid members with attendance in this month."
      },
      "unpaidAbsent": {
        "title": "Unpaid and absent",
        "empty": "No unpaid absent members in this month."
      },
      "paid": {
        "title": "Paid",
        "empty": "No paid members in this month."
      }
    },
    "table": {
      "attendanceBadge": "{count} SES.",
      "age": "{age} yrs",
      "ageUnknown": "Age unknown",
      "paid": "Paid"
    },
    "states": {
      "loading": "Loading payments",
      "error": "The monthly payment status could not be loaded.",
      "retry": "Try again",
      "emptyTitle": "No members to review yet",
      "emptyBody": "Add members and the monthly payment ledger will appear here automatically.",
      "noMatchesTitle": "No matches for these filters",
      "noMatchesBody": "Widen the age range or change the member name you searched for."
    },
    "feedback": {
      "title": "Status already updated",
      "alreadyRecorded": "The payment from {memberName} for {month} is already saved."
    },
    "confirmation": {
      "eyebrow": "Confirmation",
      "title": "Mark membership as paid?",
      "body": "Have you received the payment from {memberName} for {month}?",
      "memberLabel": "Member",
      "monthLabel": "Month",
      "ageLabel": "Age",
      "attendanceLabel": "Attendance",
      "attendanceValue": "{count} sessions in this month",
      "errors": {
        "title": "The payment could not be saved",
        "submit": "Try again. This screen has not recorded the change yet."
      }
    }
  }
}
</i18n>
