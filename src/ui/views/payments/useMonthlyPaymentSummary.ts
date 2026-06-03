import { onScopeDispose, ref, watch, type Ref } from 'vue'

import { type MembershipPaymentSummaryByMonthResult } from '@/read/ObserveMembershipPaymentSummaryByMonthQuery'
import { useAppServices } from '@/ui/appServices'

type ObservableSubscription = {
  unsubscribe(): void
}

type UseMonthlyPaymentSummaryOptions = {
  activeMonth: Ref<Date>
}

export function useMonthlyPaymentSummary({
  activeMonth
}: UseMonthlyPaymentSummaryOptions) {
  const { queries } = useAppServices()

  const summary = ref<MembershipPaymentSummaryByMonthResult>({
    paidMembersCount: 0,
    attendedUnpaidMembersCount: 0,
    totalPaidAmount: null
  })
  const isLoading = ref(true)
  const loadFailed = ref(false)

  let summarySubscription: ObservableSubscription | null = null

  function unsubscribePaymentSummary() {
    summarySubscription?.unsubscribe()
    summarySubscription = null
  }

  function subscribeToPaymentSummary(monthStart: Date) {
    unsubscribePaymentSummary()
    isLoading.value = true
    loadFailed.value = false

    summarySubscription = queries.observeMembershipPaymentSummaryByMonth
      .handle({
        month: monthStart
      })
      .subscribe({
        next(nextSummary) {
          summary.value = nextSummary
          isLoading.value = false
          loadFailed.value = false
        },
        error(error) {
          loadFailed.value = true
          isLoading.value = false
          console.error('Failed to load membership payment summary', error)
        }
      })
  }

  function retryLoading() {
    subscribeToPaymentSummary(activeMonth.value)
  }

  watch(
    activeMonth,
    (monthStart) => {
      subscribeToPaymentSummary(monthStart)
    },
    {
      immediate: true
    }
  )

  onScopeDispose(() => {
    unsubscribePaymentSummary()
  })

  return {
    isLoading,
    loadFailed,
    retryLoading,
    summary
  }
}
