<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  MembershipPaymentStatusByMonthResult,
  MembershipPaymentStatusMemberListItem,
  PaidMembershipPaymentStatusMemberListItem,
  UnpaidAttendedMembershipPaymentStatusMemberListItem
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { useAppServices } from '@/ui/appServices'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  matchesAgeRange
} from '@/ui/utils/ageRange'
// What: keep the confirmation dialog inside the payment feature package. Why: payment-specific UI should move with the ledger instead of remaining in shared components.
import MembershipPaymentConfirmationModal from './MembershipPaymentConfirmationModal.vue'
import MembershipPaymentDeleteConfirmationModal from './MembershipPaymentDeleteConfirmationModal.vue'
import { createMembershipPaymentFormatters } from './membershipPaymentFormatters'
import { useDeleteMembershipPayment } from './useDeleteMembershipPayment'
import { useMembershipPaymentReminder } from './useMembershipPaymentReminder'
import { useRegisterMembershipPayment } from './useRegisterMembershipPayment'

type ObservableSubscription = {
  unsubscribe(): void
}

const { queries } = useAppServices()
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
const paymentFormatters = createMembershipPaymentFormatters({ locale, t })
const { formatAge, formatMemberName } = paymentFormatters

const {
  confirmationErrorKey,
  confirmationMember,
  confirmPayment,
  dismissConfirmationError,
  dismissPaymentFeedback,
  closeConfirmationDialog,
  isConfirmingPayment,
  openPaymentConfirmation,
  paymentFeedback,
  selectedMemberForConfirmation
} = useRegisterMembershipPayment({
  activeMonth,
  formatters: paymentFormatters
})

const {
  deletePayment,
  deletionErrorKey,
  deletionMember,
  dismissDeletionError,
  closeDeletionDialog,
  isDeletingPayment,
  openPaymentDeletion: openMembershipPaymentDeletion,
  selectedMemberForDeletion
} = useDeleteMembershipPayment({
  activeMonth,
  formatters: paymentFormatters
})

const {
  dismissReminderError,
  isSendingReminderForMember,
  reminderErrorKey,
  sendReminder
} = useMembershipPaymentReminder({
  activeMonth,
  locale
})

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
const deletionError = computed(() =>
  deletionErrorKey.value === null
    ? ''
    : t(`deleteConfirmation.errors.${deletionErrorKey.value}`)
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
  dismissPaymentFeedback()
  dismissReminderError()
  closeConfirmationDialog()
  closeDeletionDialog()
  activeMonth.value = month
}

function retryLoading() {
  subscribeToPaymentsLedger(activeMonth.value)
}

function openPaymentDeletion(
  member: PaidMembershipPaymentStatusMemberListItem
) {
  dismissPaymentFeedback()
  openMembershipPaymentDeletion(member)
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

onBeforeUnmount(() => {
  unsubscribePaymentsLedger()
})
</script>

<template>
  <div class="payments-view mx-auto max-w-4xl pt-4 pb-12">
    <section
      class="payments-view__hero mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between"
    >
      <div class="max-w-2xl">
        <h2 class="payments-view__title">
          {{ t('summary.title') }}
        </h2>
      </div>
      <!-- What: move month switching into the first payments control surface. Why: coaches choose the covered ledger before they scan or mark any member, matching the attendance flow's context-first structure. -->
      <MonthSelector
        :model-value="activeMonth"
        @update:model-value="handleMonthChange"
      />
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
            class="payments-member-row payments-member-row--paid bg-emerald-50/70"
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

            <div class="payments-paid-actions">
              <span class="payments-paid-indicator">
                <AppIcon name="check_circle" />
                <span>{{ t('table.paid') }}</span>
              </span>
              <DeleteIconButton
                :id="`payments-open-delete-${member.id}`"
                :aria-label="
                  t('actions.deletePaymentFor', {
                    memberName: formatMemberName(member)
                  })
                "
                :title="
                  t('actions.deletePaymentFor', {
                    memberName: formatMemberName(member)
                  })
                "
                type="button"
                @click="openPaymentDeletion(member)"
              />
            </div>
          </article>
        </template>
      </section>
    </div>

    <MembershipPaymentConfirmationModal
      :error-message="confirmationError"
      :error-title="t('confirmation.errors.title')"
      :is-pending="isConfirmingPayment"
      :member="confirmationMember"
      :visible="selectedMemberForConfirmation !== null"
      @close="closeConfirmationDialog"
      @confirm="confirmPayment"
      @dismiss-error="dismissConfirmationError"
    />
    <MembershipPaymentDeleteConfirmationModal
      :error-message="deletionError"
      :error-title="t('deleteConfirmation.errors.title')"
      :is-pending="isDeletingPayment"
      :member="deletionMember"
      :visible="selectedMemberForDeletion !== null"
      @close="closeDeletionDialog"
      @confirm="deletePayment"
      @dismiss-error="dismissDeletionError"
    />
  </div>
</template>

<style scoped>
.payments-view {
  /* What: keep the last payment rows visible above the shell navigation. Why: the monthly ledger is a long-scrolling PWA screen and the fixed bottom nav permanently occupies the lower viewport edge. */
  padding-bottom: max(8.5rem, calc(5rem + env(safe-area-inset-bottom) + 4rem));
}

.payments-view__hero {
  position: relative;
}

.payments-view__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(3.5rem, 12vw, 6rem);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.06em;
  text-transform: uppercase;
  color: var(--color-on-surface);
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

.payments-paid-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  justify-self: end;
}

.payments-paid-indicator :deep(.app-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

@media (min-width: 720px) {
  .payments-member-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .payments-member-actions {
    grid-template-columns: repeat(2, minmax(0, auto));
  }

  .payments-paid-actions {
    justify-self: end;
  }
}

.payments-member-row--paid {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

@media (max-width: 500px) {
  .payments-member-row--paid {
    grid-template-columns: 1fr;
  }

  .payments-paid-actions {
    justify-self: start;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "summary": {
      "title": "Płatności"
    },
    "search": {
      "label": "Szukaj członka",
      "placeholder": "Wpisz imię i nazwisko"
    },
    "actions": {
      "markAsPaid": "Oznacz jako opłacone",
      "deletePaymentFor": "Usuń płatność: {memberName}",
      "remind": "Przypomnij",
      "reminding": "Otwieranie..."
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
      "errors": {
        "title": "Nie udało się zapisać płatności",
        "submit": "Spróbuj ponownie. Ten ekran nie zapisał jeszcze zmiany."
      }
    },
    "deleteConfirmation": {
      "errors": {
        "title": "Nie udało się usunąć płatności",
        "missing": "Ta płatność została już usunięta albo nie jest dostępna.",
        "submit": "Spróbuj ponownie. Ten ekran nie usunął jeszcze płatności."
      }
    }
  },
  "en": {
    "summary": {
      "title": "Payments"
    },
    "search": {
      "label": "Search member",
      "placeholder": "Type first and last name"
    },
    "actions": {
      "markAsPaid": "Mark as paid",
      "deletePaymentFor": "Delete payment: {memberName}",
      "remind": "Remind",
      "reminding": "Opening..."
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
      "errors": {
        "title": "The payment could not be saved",
        "submit": "Try again. This screen has not recorded the change yet."
      }
    },
    "deleteConfirmation": {
      "errors": {
        "title": "The payment could not be deleted",
        "missing": "This payment has already been deleted or is not available.",
        "submit": "Try again. This screen has not deleted the payment yet."
      }
    }
  }
}
</i18n>
