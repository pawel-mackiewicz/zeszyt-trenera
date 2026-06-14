<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  MembershipPaymentStatusMemberListItem,
  PaidMembershipPaymentStatusMemberListItem
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import MemberFilterSortSection from '@/ui/components/MemberFilterSortSection.vue'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import { AGE_FILTER_MAX, AGE_FILTER_MIN } from '@/ui/utils/ageRange'
import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'
import { toMembershipPaymentCoveredMonth } from '@/write/memberships/domain/MembershipPayment'
import type { MoneySnapshot } from '@/write/shared/vo/Money'
// What: keep the confirmation dialog inside the payment feature package. Why: payment-specific UI should move with the ledger instead of remaining in shared components.
import MembershipPaymentConfirmationModal from './components/MembershipPaymentConfirmationModal.vue'
import MembershipPaymentDeleteConfirmationModal from './components/MembershipPaymentDeleteConfirmationModal.vue'
import MembershipPaymentSummarySection from './components/MembershipPaymentSummarySection.vue'
import PaidSection from './components/PaidSection.vue'
import UnpaidAbsentSection from './components/UnpaidAbsentSection.vue'
import UnpaidAttendedSection from './components/UnpaidAttendedSection.vue'
import {
  membershipPaymentActionContextKey,
  type MembershipPaymentDisplayMember
} from './membershipPaymentActions'
import { createMembershipPaymentFormatters } from './membershipPaymentFormatters'
import { useMonthlyPaymentLedger } from './useMonthlyPaymentLedger'
import { useMonthlyPaymentSummary } from './useMonthlyPaymentSummary'
import { useDeleteMembershipPayment } from './useDeleteMembershipPayment'
import { useMembershipPaymentReminder } from './useMembershipPaymentReminder'
import { useRegisterMembershipPayment } from './useRegisterMembershipPayment'

type CoveredMonth = ReturnType<typeof toMembershipPaymentCoveredMonth>

type ConfirmPaymentTarget = MembershipPaymentStatusMemberListItem & {
  attendanceCount: number
  coveredMonth: CoveredMonth
  coveredMonthLabel: string
}

type MembershipPaymentConfirmationMember = {
  attendanceCount: number
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

type DeletePaymentTarget = PaidMembershipPaymentStatusMemberListItem & {
  coveredMonthLabel: string
}

type MembershipPaymentDeleteConfirmationMember = {
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

type PaymentFeedbackMessage = {
  kind: 'alreadyRecorded'
  memberName: string
  coveredMonthLabel: string
} | null

const { t, locale } = useI18n({ useScope: 'local' })

const activeMonth = ref(startOfMonth(new Date()))
const searchQuery = ref('')
const minAgeFilter = ref(AGE_FILTER_MIN)
const maxAgeFilter = ref(AGE_FILTER_MAX)
const memberSortField = ref<MemberSortField>('firstName')
const memberSortDirection = ref<MemberSortDirection>('asc')
const paymentFormatters = createMembershipPaymentFormatters({ locale, t })
const {
  formatAge: formatAgeFromFormatters,
  formatMemberName: formatMemberNameFromFormatters
} = paymentFormatters

const {
  filteredMemberCount,
  filteredPaidMembers,
  filteredUnpaidAbsentMembers,
  filteredUnpaidAttendedMembers,
  isLoading,
  loadFailed,
  retryLoading,
  totalMemberCount
} = useMonthlyPaymentLedger({
  activeMonth,
  locale,
  maxAgeFilter,
  memberSortDirection,
  memberSortField,
  minAgeFilter,
  searchQuery
})

const {
  isLoading: isSummaryLoading,
  loadFailed: summaryLoadFailed,
  retryLoading: retrySummaryLoading,
  summary: paymentSummary
} = useMonthlyPaymentSummary({
  activeMonth
})

const {
  dismissError: dismissConfirmationError,
  dismissFeedback: dismissRegisterPaymentFeedback,
  errorKey: confirmationErrorKey,
  execute: executeRegisterMembershipPayment,
  feedback: registerPaymentFeedback,
  isPending: isConfirmingPayment
} = useRegisterMembershipPayment()

const {
  dismissError: dismissDeletionError,
  errorKey: deletionErrorKey,
  execute: executeDeleteMembershipPayment,
  isPending: isDeletingPayment
} = useDeleteMembershipPayment()

const {
  dismissError: dismissReminderError,
  errorKey: reminderErrorKey,
  execute: executeMembershipPaymentReminder,
  isPending: isSendingReminder
} = useMembershipPaymentReminder()

const paymentFeedback = ref<PaymentFeedbackMessage>(null)
const reminderInFlightMemberId = ref<string | null>(null)
const selectedMemberForConfirmation = ref<ConfirmPaymentTarget | null>(null)
const selectedMemberForDeletion = ref<DeletePaymentTarget | null>(null)
function formatAge(member: MembershipPaymentDisplayMember): string {
  return formatAgeFromFormatters(
    member as MembershipPaymentStatusMemberListItem
  )
}
function formatMemberName(member: MembershipPaymentDisplayMember): string {
  return formatMemberNameFromFormatters(
    member as MembershipPaymentStatusMemberListItem
  )
}
const confirmationMember = computed<MembershipPaymentConfirmationMember | null>(
  () => {
    const selectedMember = selectedMemberForConfirmation.value

    if (selectedMember === null) {
      return null
    }

    return {
      attendanceCount: selectedMember.attendanceCount,
      ageLabel: formatAge(selectedMember),
      coveredMonthLabel: selectedMember.coveredMonthLabel,
      memberName: formatMemberName(selectedMember)
    }
  }
)
const deletionMember =
  computed<MembershipPaymentDeleteConfirmationMember | null>(() => {
    const selectedMember = selectedMemberForDeletion.value

    if (selectedMember === null) {
      return null
    }

    return {
      ageLabel: formatAge(selectedMember),
      coveredMonthLabel: selectedMember.coveredMonthLabel,
      memberName: formatMemberName(selectedMember)
    }
  })
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

function clearConfirmationDialog() {
  selectedMemberForConfirmation.value = null
  dismissConfirmationError()
}

function closeConfirmationDialog() {
  if (isConfirmingPayment.value) {
    return
  }

  clearConfirmationDialog()
}

function dismissPaymentFeedback() {
  paymentFeedback.value = null
  dismissRegisterPaymentFeedback()
}

function openPaymentConfirmation(
  member: MembershipPaymentStatusMemberListItem,
  attendanceCount = 0
) {
  dismissPaymentFeedback()
  dismissConfirmationError()

  // What: snapshot the selected member with the visible month. Why: the dialog should confirm the exact application-layer write command even if the screen state changes afterward.
  selectedMemberForConfirmation.value = {
    ...member,
    attendanceCount,
    coveredMonth: toMembershipPaymentCoveredMonth(activeMonth.value),
    coveredMonthLabel: paymentFormatters.formatMonth(activeMonth.value)
  }
}

async function confirmPayment(chargedAmount: MoneySnapshot) {
  const selectedMember = selectedMemberForConfirmation.value

  if (selectedMember === null) {
    return
  }

  const completed = await executeRegisterMembershipPayment({
    chargedAmount,
    coveredMonth: selectedMember.coveredMonth,
    memberId: selectedMember.id
  })

  if (!completed) {
    return
  }

  if (registerPaymentFeedback.value?.kind === 'alreadyRecorded') {
    paymentFeedback.value = {
      kind: 'alreadyRecorded',
      memberName: formatMemberName(selectedMember),
      coveredMonthLabel: selectedMember.coveredMonthLabel
    }
  }

  clearConfirmationDialog()
}

function clearDeletionDialog() {
  selectedMemberForDeletion.value = null
  dismissDeletionError()
}

function closeDeletionDialog() {
  if (isDeletingPayment.value) {
    return
  }

  clearDeletionDialog()
}

function openPaymentDeletion(
  member: PaidMembershipPaymentStatusMemberListItem
) {
  dismissPaymentFeedback()
  dismissDeletionError()

  selectedMemberForDeletion.value = {
    ...member,
    coveredMonthLabel: paymentFormatters.formatMonth(activeMonth.value)
  }
}

async function deletePayment() {
  const selectedMember = selectedMemberForDeletion.value

  if (selectedMember === null) {
    return
  }

  const completed = await executeDeleteMembershipPayment({
    membershipPaymentId: selectedMember.membershipPaymentId
  })

  if (completed) {
    clearDeletionDialog()
  }
}

function isSendingReminderForMember(memberId: string): boolean {
  return isSendingReminder.value && reminderInFlightMemberId.value === memberId
}

async function sendReminder(member: MembershipPaymentStatusMemberListItem) {
  if (isSendingReminder.value) {
    return
  }

  reminderInFlightMemberId.value = member.id

  try {
    await executeMembershipPaymentReminder({
      coveredMonth: toMembershipPaymentCoveredMonth(activeMonth.value),
      locale: locale.value,
      memberId: member.id
    })
  } finally {
    reminderInFlightMemberId.value = null
  }
}

provide(membershipPaymentActionContextKey, {
  isSendingReminderForMember,
  openPaymentConfirmation,
  openPaymentDeletion,
  sendReminder
})

function handleMonthChange(month: Date) {
  // What: reset month-specific UI state before swapping the shared selector value. Why: payment feedback and confirmation copy belong to one covered month and must not leak into the next ledger.
  dismissPaymentFeedback()
  dismissReminderError()
  closeConfirmationDialog()
  closeDeletionDialog()
  activeMonth.value = month
}
</script>

<template>
  <div class="pt-4 pb-12">
    <section
      class="payments-view__hero mb-4 flex flex-col gap-6 md:mb-6 md:flex-row md:items-end md:justify-between"
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

    <MembershipPaymentSummarySection
      class="mb-8"
      :is-loading="isSummaryLoading"
      :load-failed="summaryLoadFailed"
      :summary="paymentSummary"
      @retry="retrySummaryLoading"
    />

    <!-- What: keep filters directly below the summary and above the grouped ledger. Why: payments should reuse the same continuous scan-and-filter rhythm as attendance while the monthly totals remain visible before narrowing the list. -->
    <MemberFilterSortSection
      v-model:search-query="searchQuery"
      v-model:min-age-filter="minAgeFilter"
      v-model:max-age-filter="maxAgeFilter"
      v-model:member-sort-field="memberSortField"
      v-model:member-sort-direction="memberSortDirection"
      search-input-id="payments-search"
      :search-label="t('search.label')"
      :search-placeholder="t('search.placeholder')"
    />

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
      v-else-if="totalMemberCount === 0"
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
      v-else-if="filteredMemberCount === 0"
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
      <UnpaidAttendedSection
        :format-age="formatAge"
        :format-member-name="formatMemberName"
        :members="filteredUnpaidAttendedMembers"
      />

      <UnpaidAbsentSection
        :format-age="formatAge"
        :format-member-name="formatMemberName"
        :members="filteredUnpaidAbsentMembers"
      />

      <PaidSection
        :format-age="formatAge"
        :format-member-name="formatMemberName"
        :members="filteredPaidMembers"
      />
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
      "deletePaymentFor": "Usuń płatność: {memberName}"
    },
    "table": {
      "age": "{age} lat",
      "ageUnknown": "Wiek nieznany"
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
      "deletePaymentFor": "Delete payment: {memberName}"
    },
    "table": {
      "age": "{age} yrs",
      "ageUnknown": "Age unknown"
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
