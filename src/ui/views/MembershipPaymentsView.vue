<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  MemberPhoneNumberMissingError,
  PaymentReminderSenderMissingError
} from '@/application/SendMembershipPaymentReminderUseCase'
import {
  MembershipPaymentAlreadyExistsError,
  toMembershipPaymentCoveredMonth
} from '@/domain/model/MembershipPayment'
import { MemberNotFoundError } from '@/domain/model/Member'
import type {
  MembershipPaymentStatusByMonthResult,
  MembershipPaymentStatusMemberListItem,
  UnpaidAttendedMembershipPaymentStatusMemberListItem
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { useAppServices } from '@/ui/appServices'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import { calculateAge } from '@/ui/utils/age'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  matchesAgeRange
} from '@/ui/utils/ageRange'

type ObservableSubscription = {
  unsubscribe(): void
}

type ConfirmationErrorKey = 'submit' | null
type ReminderErrorKey =
  | 'memberMissing'
  | 'phoneMissing'
  | 'senderMissing'
  | 'submit'
  | null

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
const reminderErrorKey = ref<ReminderErrorKey>(null)
const reminderInFlightMemberId = ref<string | null>(null)
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
const activeMonthLabel = computed(() => formatMonth(activeMonth.value))
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
const reminderErrorMessage = computed(() =>
  reminderErrorKey.value === null
    ? ''
    : t(`reminder.errors.${reminderErrorKey.value}`)
)

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
  // What: render the payment-age label from required birth-date data.
  return t('table.age', { age: calculateRequiredAge(member.dateOfBirth) })
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

function calculateRequiredAge(dateOfBirth: Date, now = new Date()): number {
  const age = calculateAge(dateOfBirth, now)
  if (age === null) {
    // Why: when persisted data is malformed, falling back to zero keeps rendering stable while still making the issue obvious in the UI.
    return 0
  }

  return age
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

function dismissPaymentFeedback() {
  // What: let coaches clear the shared floating feedback error after reading it. Why: duplicate-payment warnings should stay visible long enough to explain the no-op without occupying the top of the ledger forever.
  paymentFeedback.value = null
}

function dismissReminderError() {
  // What: let coaches clear reminder-specific errors without changing any list filters. Why: SMS launch failures are recoverable side-effects and should not force a month or search reset to continue work.
  reminderErrorKey.value = null
}

function dismissConfirmationError() {
  // What: let the confirmation flow clear the shared floating error card while keeping the dialog open. Why: a failed payment write should be retryable without forcing the coach to stare at a stale warning between attempts.
  confirmationErrorKey.value = null
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
  reminderErrorKey.value = null
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

function isSendingReminderForMember(memberId: string): boolean {
  return reminderInFlightMemberId.value === memberId
}

function resolveReminderLocale(value: string): 'pl' | 'en' {
  return value.toLowerCase().startsWith('pl') ? 'pl' : 'en'
}

async function sendReminder(member: MembershipPaymentStatusMemberListItem) {
  if (isSendingReminderForMember(member.id)) {
    return
  }

  reminderErrorKey.value = null
  reminderInFlightMemberId.value = member.id

  try {
    // What: trigger reminder composition through the shared application use case. Why: the view should not assemble sender identity or SMS copy directly, so message policy stays centralized and testable.
    await useCases.sendMembershipPaymentReminder.handle({
      memberId: member.id,
      coveredMonth: toMembershipPaymentCoveredMonth(activeMonth.value),
      locale: resolveReminderLocale(locale.value)
    })
  } catch (error) {
    if (error instanceof MemberNotFoundError) {
      reminderErrorKey.value = 'memberMissing'
    } else if (error instanceof MemberPhoneNumberMissingError) {
      reminderErrorKey.value = 'phoneMissing'
    } else if (error instanceof PaymentReminderSenderMissingError) {
      reminderErrorKey.value = 'senderMissing'
    } else {
      reminderErrorKey.value = 'submit'
    }
  } finally {
    reminderInFlightMemberId.value = null
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
  <div class="payments-view mx-auto max-w-4xl pt-4 pb-12">
    <section class="mb-10 flex flex-col gap-3">
      <p
        class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
      >
        {{ t('summary.eyebrow') }}
      </p>
      <!-- What: move month switching into the first payments control surface. Why: coaches choose the covered ledger before they scan or mark any member, matching the attendance flow's context-first structure. -->
      <MonthSelector
        :model-value="activeMonth"
        @update:model-value="handleMonthChange"
      />
      <p class="font-mono text-xs uppercase tracking-[0.18em] text-secondary">
        {{ activeMonthLabel }}
      </p>
    </section>

    <!-- What: surface ledger feedback through the shared floating error card. Why: duplicate-payment warnings should appear in the same top-level location as other recoverable errors instead of blending into the ledger content. -->
    <FloatingErrorAlert
      v-if="feedbackMessage"
      :message="feedbackMessage"
      :title="t('feedback.title')"
      top-offset="shell"
      @dismiss="dismissPaymentFeedback"
    />
    <!-- What: surface reminder launch failures through the shared floating error card. Why: SMS side-effects can fail independently from payment writes, and coaches need one consistent top-level recovery surface across both flows. -->
    <FloatingErrorAlert
      v-if="reminderErrorMessage"
      :message="reminderErrorMessage"
      :title="t('reminder.errors.title')"
      top-offset="shell"
      @dismiss="dismissReminderError"
    />

    <!-- What: keep filters directly above the grouped ledger. Why: payments should reuse the same continuous scan-and-filter rhythm as attendance instead of splitting search into a separate hero block. -->
    <section class="mb-4 pb-2">
      <div class="flex flex-col gap-2">
        <AgeRangeFilter
          v-model:min-value="minAgeFilter"
          v-model:max-value="maxAgeFilter"
          :max-bound="AGE_FILTER_MAX"
          :min-bound="AGE_FILTER_MIN"
        />
        <div class="mt-6">
          <SearchBar
            v-model="searchQuery"
            input-id="payments-search"
            :input-label="t('search.label')"
            :placeholder="t('search.placeholder')"
          />
        </div>
      </div>
    </section>

    <section
      v-if="isLoading"
      class="payments-state-card mb-10 px-5 py-6 text-center font-mono text-sm font-bold uppercase text-secondary"
    >
      {{ t('states.loading') }}
    </section>

    <section v-else-if="loadFailed" class="payments-state-card mb-10 px-5 py-6">
      <p class="text-sm leading-6 text-secondary">{{ t('states.error') }}</p>
      <AppButton variant="secondary" type="button" @click="retryLoading">
        {{ t('states.retry') }}
      </AppButton>
    </section>

    <section
      v-else-if="sourceMemberCount === 0"
      class="payments-state-card mb-10 px-5 py-6"
    >
      <p class="font-headline text-2xl font-bold uppercase tracking-tight">
        {{ t('states.emptyTitle') }}
      </p>
      <p class="text-sm leading-6 text-secondary">
        {{ t('states.emptyBody') }}
      </p>
    </section>

    <section
      v-else-if="visibleMemberCount === 0"
      class="payments-state-card mb-10 px-5 py-6"
    >
      <p class="font-headline text-2xl font-bold uppercase tracking-tight">
        {{ t('states.noMatchesTitle') }}
      </p>
      <p class="text-sm leading-6 text-secondary">
        {{ t('states.noMatchesBody') }}
      </p>
    </section>

    <div v-else class="mb-10 flex flex-col gap-8">
      <section class="payments-ledger-section">
        <div class="border-b border-outline-variant px-4 py-3">
          <div
            class="payments-ledger-section__title payments-ledger-section__title--alert"
          >
            {{ t('sections.unpaidAttended.title') }}
          </div>
        </div>

        <div
          v-if="filteredUnpaidAttendedMembers.length === 0"
          class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
        >
          {{ t('sections.unpaidAttended.empty') }}
        </div>

        <template v-else>
          <article
            v-for="member in filteredUnpaidAttendedMembers"
            :key="member.id"
            class="payments-member-row bg-primary/5"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-baseline gap-3">
                <p
                  class="truncate font-headline text-xl font-bold uppercase tracking-tight"
                >
                  {{ formatMemberName(member) }}
                </p>
                <span
                  class="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-primary"
                >
                  {{
                    t('table.attendanceBadge', {
                      count: member.attendanceSessionIds.length
                    })
                  }}
                </span>
              </div>
              <p
                class="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-secondary"
              >
                {{ formatAge(member) }}
              </p>
            </div>

            <!-- What: keep remind and payment actions side by side per unpaid member. Why: coaches can send a payment prompt and then mark settlement from the same row without scanning for controls elsewhere on mobile. -->
            <div class="payments-member-actions w-full sm:w-auto">
              <AppButton
                :id="`payments-remind-${member.id}`"
                :disabled="
                  !member.hasPhoneNumber ||
                  isSendingReminderForMember(member.id)
                "
                class="w-full sm:w-auto"
                variant="secondary"
                type="button"
                @click="sendReminder(member)"
              >
                {{
                  isSendingReminderForMember(member.id)
                    ? t('actions.reminding')
                    : t('actions.remind')
                }}
              </AppButton>
              <AppButton
                :id="`payments-open-confirm-${member.id}`"
                class="w-full sm:w-auto"
                type="button"
                @click="
                  openPaymentConfirmation(
                    member,
                    member.attendanceSessionIds.length
                  )
                "
              >
                {{ t('actions.markAsPaid') }}
              </AppButton>
            </div>
          </article>
        </template>
      </section>

      <section class="payments-ledger-section">
        <div class="border-b border-outline-variant px-4 py-3">
          <div
            class="payments-ledger-section__title payments-ledger-section__title--quiet"
          >
            {{ t('sections.unpaidAbsent.title') }}
          </div>
        </div>

        <div
          v-if="filteredUnpaidAbsentMembers.length === 0"
          class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
        >
          {{ t('sections.unpaidAbsent.empty') }}
        </div>

        <template v-else>
          <article
            v-for="member in filteredUnpaidAbsentMembers"
            :key="member.id"
            class="payments-member-row bg-surface-container-low/60"
          >
            <div class="min-w-0">
              <p
                class="truncate font-headline text-xl font-bold uppercase tracking-tight"
              >
                {{ formatMemberName(member) }}
              </p>
              <p
                class="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-secondary"
              >
                {{ formatAge(member) }}
              </p>
            </div>

            <div class="payments-member-actions w-full sm:w-auto">
              <AppButton
                :id="`payments-remind-${member.id}`"
                :disabled="
                  !member.hasPhoneNumber ||
                  isSendingReminderForMember(member.id)
                "
                class="w-full sm:w-auto"
                variant="secondary"
                type="button"
                @click="sendReminder(member)"
              >
                {{
                  isSendingReminderForMember(member.id)
                    ? t('actions.reminding')
                    : t('actions.remind')
                }}
              </AppButton>
              <AppButton
                :id="`payments-open-confirm-${member.id}`"
                class="w-full sm:w-auto"
                variant="secondary"
                type="button"
                @click="openPaymentConfirmation(member)"
              >
                {{ t('actions.markAsPaid') }}
              </AppButton>
            </div>
          </article>
        </template>
      </section>

      <section class="payments-ledger-section">
        <div class="border-b border-outline-variant px-4 py-3">
          <div
            class="payments-ledger-section__title payments-ledger-section__title--paid"
          >
            {{ t('sections.paid.title') }}
          </div>
        </div>

        <div
          v-if="filteredPaidMembers.length === 0"
          class="px-4 py-8 text-center font-mono text-sm font-bold uppercase text-secondary"
        >
          {{ t('sections.paid.empty') }}
        </div>

        <template v-else>
          <article
            v-for="member in filteredPaidMembers"
            :key="member.id"
            class="payments-member-row bg-emerald-50/70"
          >
            <div class="min-w-0">
              <p
                class="truncate font-headline text-xl font-bold uppercase tracking-tight"
              >
                {{ formatMemberName(member) }}
              </p>
              <p
                class="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-secondary"
              >
                {{ formatAge(member) }}
              </p>
            </div>

            <span class="payments-paid-indicator">
              <AppIcon name="check_circle" />
              <span>{{ t('table.paid') }}</span>
            </span>
          </article>
        </template>
      </section>
    </div>

    <Transition name="payments-overlay">
      <div
        v-if="selectedMemberForConfirmation"
        class="fixed inset-0 z-70 flex items-end justify-center p-4 sm:items-center"
      >
        <div
          class="payments-confirmation__backdrop"
          @click="closeConfirmationDialog"
        ></div>
        <section
          aria-labelledby="payments-confirmation-title"
          aria-modal="true"
          class="relative grid w-full max-w-lg gap-4 border border-on-surface bg-surface p-5 hard-shadow"
          role="dialog"
        >
          <p
            class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
          >
            {{ t('confirmation.eyebrow') }}
          </p>
          <h3
            id="payments-confirmation-title"
            class="font-headline text-[2rem] font-bold uppercase tracking-tight"
          >
            {{ t('confirmation.title') }}
          </h3>
          <p class="text-sm leading-6 text-secondary">
            {{
              t('confirmation.body', {
                memberName: formatMemberName(selectedMemberForConfirmation),
                month: selectedMemberForConfirmation.coveredMonthLabel
              })
            }}
          </p>

          <dl class="grid gap-3 sm:grid-cols-2">
            <div class="payments-confirmation__detail">
              <dt
                class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
              >
                {{ t('confirmation.memberLabel') }}
              </dt>
              <dd
                class="font-headline text-lg font-bold uppercase tracking-tight"
              >
                {{ formatMemberName(selectedMemberForConfirmation) }}
              </dd>
            </div>
            <div class="payments-confirmation__detail">
              <dt
                class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
              >
                {{ t('confirmation.monthLabel') }}
              </dt>
              <dd
                class="font-headline text-lg font-bold uppercase tracking-tight"
              >
                {{ selectedMemberForConfirmation.coveredMonthLabel }}
              </dd>
            </div>
            <div class="payments-confirmation__detail">
              <dt
                class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
              >
                {{ t('confirmation.ageLabel') }}
              </dt>
              <dd
                class="font-headline text-lg font-bold uppercase tracking-tight"
              >
                {{ formatAge(selectedMemberForConfirmation) }}
              </dd>
            </div>
            <div
              v-if="selectedMemberForConfirmation.attendanceCount > 0"
              class="payments-confirmation__detail"
            >
              <dt
                class="font-label text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-secondary"
              >
                {{ t('confirmation.attendanceLabel') }}
              </dt>
              <dd
                class="font-headline text-lg font-bold uppercase tracking-tight"
              >
                {{
                  t('confirmation.attendanceValue', {
                    count: selectedMemberForConfirmation.attendanceCount
                  })
                }}
              </dd>
            </div>
          </dl>

          <FloatingErrorAlert
            v-if="confirmationError"
            :message="confirmationError"
            :title="t('confirmation.errors.title')"
            top-offset="shell"
            @dismiss="dismissConfirmationError"
          />

          <div
            class="payments-confirmation__actions flex flex-col gap-3 sm:flex-row sm:justify-end"
          >
            <AppButton
              :disabled="isConfirmingPayment"
              type="button"
              @click="confirmPayment"
            >
              {{
                isConfirmingPayment
                  ? t('actions.confirmingPayment')
                  : t('actions.confirmPayment')
              }}
            </AppButton>
            <AppButton
              :disabled="isConfirmingPayment"
              variant="secondary"
              type="button"
              @click="closeConfirmationDialog"
            >
              {{ t('actions.cancel') }}
            </AppButton>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.payments-view {
  /* What: keep the last payment rows visible above the shell navigation. Why: the monthly ledger is a long-scrolling PWA screen and the fixed bottom nav permanently occupies the lower viewport edge. */
  padding-bottom: max(8.5rem, calc(5rem + env(safe-area-inset-bottom) + 4rem));
}

.payments-state-card {
  display: grid;
  gap: 1rem;
  justify-items: start;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(26, 28, 28, 0.92);
}

.payments-ledger-section {
  overflow: hidden;
  border-top: 1px solid var(--color-on-surface);
  border-bottom: 1px solid var(--color-outline-variant);
}

.payments-ledger-section__title {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.payments-ledger-section__title--alert {
  color: var(--color-primary);
}

.payments-ledger-section__title--quiet {
  color: var(--color-secondary);
}

.payments-ledger-section__title--paid {
  color: var(--success);
}

.payments-member-row {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
}

.payments-member-actions {
  /* What: keep each unpaid row action cluster compact on narrow devices and horizontal on larger ones. Why: payment workflows are mobile-first, but two adjacent actions should not force full-row wrapping once desktop space is available. */
  display: grid;
  gap: 0.5rem;
}

.payments-member-row:last-child {
  border-bottom: 0;
}

.payments-paid-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-self: start;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--success);
}

.payments-paid-indicator :deep(.app-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.payments-confirmation__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(2px);
}

.payments-confirmation__detail {
  display: grid;
  gap: 0.35rem;
  padding: 0.875rem;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-low);
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
  .payments-member-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .payments-member-actions {
    grid-template-columns: repeat(2, minmax(0, auto));
  }

  .payments-paid-indicator {
    justify-self: end;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "summary": {
      "eyebrow": "Miesięczny status składek"
    },
    "search": {
      "label": "Szukaj członka",
      "placeholder": "Wpisz imię i nazwisko"
    },
    "actions": {
      "markAsPaid": "Oznacz jako opłacone",
      "remind": "Przypomnij",
      "reminding": "Otwieranie...",
      "confirmPayment": "Potwierdź płatność",
      "confirmingPayment": "Zapisywanie...",
      "cancel": "Anuluj"
    },
    "sections": {
      "unpaidAttended": {
        "title": "Obecni i nieopłacili",
        "empty": "Brak nieopłaconych osób z obecnościami w tym miesiącu."
      },
      "unpaidAbsent": {
        "title": "Nieobecni i nieopłacili",
        "empty": "Brak nieopłaconych nieobecnych w tym miesiącu."
      },
      "paid": {
        "title": "Opłacili",
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
    "reminder": {
      "errors": {
        "title": "Nie udało się otworzyć wiadomości SMS",
        "memberMissing": "Nie znaleziono członka do przypomnienia o składce.",
        "phoneMissing": "Ten członek nie ma zapisanego numeru telefonu.",
        "senderMissing": "Uzupełnij dane klubu i trenera, aby wysyłać przypomnienia.",
        "submit": "Spróbuj ponownie. Ten ekran nie otworzył jeszcze wiadomości SMS."
      }
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
    "summary": {
      "eyebrow": "Monthly membership ledger"
    },
    "search": {
      "label": "Search member",
      "placeholder": "Type first and last name"
    },
    "actions": {
      "markAsPaid": "Mark as paid",
      "remind": "Remind",
      "reminding": "Opening...",
      "confirmPayment": "Confirm payment",
      "confirmingPayment": "Saving...",
      "cancel": "Cancel"
    },
    "sections": {
      "unpaidAttended": {
        "title": "Attended and unpaid",
        "empty": "No unpaid members with attendance in this month."
      },
      "unpaidAbsent": {
        "title": "Absent and unpaid",
        "empty": "No unpaid absent members in this month."
      },
      "paid": {
        "title": "Paid up",
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
    "reminder": {
      "errors": {
        "title": "Could not open SMS message",
        "memberMissing": "The member for this reminder could not be found.",
        "phoneMissing": "This member does not have a phone number saved.",
        "senderMissing": "Set up trainer and club details before sending reminders.",
        "submit": "Try again. This screen has not opened the SMS composer yet."
      }
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
