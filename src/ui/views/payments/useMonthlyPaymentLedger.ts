import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import {
  type MembershipPaymentStatusByMonthResult,
  type MembershipPaymentStatusMemberListItem
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { matchesAgeRange } from '@/ui/utils/ageRange'
import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'
import { sortMemberListItems } from '@/ui/utils/sortMemberListItems'

import { createMembershipPaymentFormatters } from './membershipPaymentFormatters'

type ObservableSubscription = {
  unsubscribe(): void
}

type UseMonthlyPaymentLedgerOptions = {
  activeMonth: Ref<Date>
  locale: Ref<string>
  maxAgeFilter: Ref<number>
  memberSortDirection: Ref<MemberSortDirection>
  memberSortField: Ref<MemberSortField>
  minAgeFilter: Ref<number>
  searchQuery: Ref<string>
}

export function useMonthlyPaymentLedger({
  activeMonth,
  locale,
  maxAgeFilter,
  memberSortDirection,
  memberSortField,
  minAgeFilter,
  searchQuery
}: UseMonthlyPaymentLedgerOptions) {
  const { queries } = useAppServices()
  const { t } = useI18n({ useScope: 'local' })
  const paymentFormatters = createMembershipPaymentFormatters({ locale, t })

  const result = ref<MembershipPaymentStatusByMonthResult>({
    paidMembers: [],
    unpaidAbsentMembers: [],
    unpaidAttendedMembers: []
  })
  const isLoading = ref(true)
  const loadFailed = ref(false)

  let paymentsSubscription: ObservableSubscription | null = null

  const searchValue = computed(() => searchQuery.value.trim().toLowerCase())

  const filteredPaidMembers = computed(() =>
    filterAndSortMembers(result.value.paidMembers)
  )
  const filteredUnpaidAbsentMembers = computed(() =>
    filterAndSortMembers(result.value.unpaidAbsentMembers)
  )
  const filteredUnpaidAttendedMembers = computed(() =>
    filterAndSortMembers(result.value.unpaidAttendedMembers)
  )
  const totalMemberCount = computed(
    () =>
      result.value.paidMembers.length +
      result.value.unpaidAbsentMembers.length +
      result.value.unpaidAttendedMembers.length
  )
  const filteredMemberCount = computed(
    () =>
      filteredPaidMembers.value.length +
      filteredUnpaidAbsentMembers.value.length +
      filteredUnpaidAttendedMembers.value.length
  )

  function matchesMemberFilters(
    member: MembershipPaymentStatusMemberListItem
  ): boolean {
    const fullName = paymentFormatters.formatMemberName(member).toLowerCase()
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
    return sortMemberListItems(members, {
      direction: memberSortDirection.value,
      field: memberSortField.value,
      locale: locale.value
    })
  }

  function filterAndSortMembers<
    T extends MembershipPaymentStatusMemberListItem
  >(members: T[]): T[] {
    return sortMembers(members.filter(matchesMemberFilters))
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

  function retryLoading() {
    subscribeToPaymentsLedger(activeMonth.value)
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

  onScopeDispose(() => {
    unsubscribePaymentsLedger()
  })

  return {
    filteredMemberCount,
    filteredPaidMembers,
    filteredUnpaidAbsentMembers,
    filteredUnpaidAttendedMembers,
    isLoading,
    loadFailed,
    retryLoading,
    totalMemberCount
  }
}
