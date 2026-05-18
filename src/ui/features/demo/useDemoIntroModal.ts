import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { useAppServices } from '@/ui/appServices'
import { useAppStore } from '@/ui/stores/app'
import {
  DemoIntroModalStatus,
  type DemoIntroModalStatusValue
} from '@/ui/features/demo/DemoIntroModal.contract'
import { useDemoStore } from '@/ui/features/demo/demo.store'

const DemoExitStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Error: 'error'
} as const
type DemoExitStatusValue = (typeof DemoExitStatus)[keyof typeof DemoExitStatus]

export function useDemoIntroModal() {
  const appStore = useAppStore()
  const demoStore = useDemoStore()
  const { useCases } = useAppServices()

  const { appReadiness, setupStatus } = storeToRefs(appStore)
  const { demoIntroModalVisible, demoModeActive } = storeToRefs(demoStore)
  const demoExitStatus = ref<DemoExitStatusValue>(DemoExitStatus.Idle)

  const isShellReady = computed(
    () => appReadiness.value === 'ready' && setupStatus.value === 'ready'
  )
  const demoExitInProgress = computed(
    () => demoExitStatus.value === DemoExitStatus.Pending
  )
  const demoExitErrorVisible = computed(
    () => demoExitStatus.value === DemoExitStatus.Error
  )
  // What: derive one modal status inside the demo feature. Why: the component can stay prop-free while shell readiness, shared modal visibility, and pending writes still collapse into one explicit UI state.
  const demoIntroModalStatus = computed<DemoIntroModalStatusValue>(() => {
    if (!isShellReady.value || !demoIntroModalVisible.value) {
      return DemoIntroModalStatus.Hidden
    }

    return demoExitInProgress.value
      ? DemoIntroModalStatus.Pending
      : DemoIntroModalStatus.Ready
  })
  const isDemoIntroModalVisible = computed(
    () => demoIntroModalStatus.value !== DemoIntroModalStatus.Hidden
  )
  const isDemoIntroModalPending = computed(
    () => demoIntroModalStatus.value === DemoIntroModalStatus.Pending
  )

  watch(demoIntroModalVisible, (visible, previousVisible) => {
    if (visible && !previousVisible) {
      // What: clear stale leave-demo failures every time the intro reopens. Why: each retry should start from a clean mobile overlay instead of carrying an old alert into a new attempt.
      demoExitStatus.value = DemoExitStatus.Idle
    }
  })

  watch(demoModeActive, (value) => {
    if (!value) {
      // What: clear modal-local retry state when demo mode shuts off anywhere. Why: once seeded data is gone, the feature must not leave a floating demo error mounted.
      demoExitStatus.value = DemoExitStatus.Idle
    }
  })

  function closeDemoIntroModal() {
    if (demoExitInProgress.value) {
      return
    }

    demoExitStatus.value = DemoExitStatus.Idle
    demoStore.dismissDemoIntroModal()
  }

  function dismissDemoExitError() {
    // What: let coaches acknowledge a failed exit without closing the modal. Why: keeping the explanation and CTA in place makes retrying faster on mobile.
    demoExitStatus.value = DemoExitStatus.Idle
  }

  async function leaveDemoMode() {
    if (demoExitInProgress.value) {
      return
    }

    demoExitStatus.value = DemoExitStatus.Pending

    try {
      // What: route demo-exit writes through the application use case. Why: local-first data resets must stay behind the application layer instead of letting UI mutate persistence directly.
      await useCases.leaveDemoMode.handle({})
      demoExitStatus.value = DemoExitStatus.Idle
      demoStore.dismissDemoIntroModal()
      demoStore.setDemoModeActive(false)
    } catch (error) {
      demoExitStatus.value = DemoExitStatus.Error
      console.error('Failed to leave demo mode.', error)
    }
  }

  return {
    demoExitErrorVisible,
    demoIntroModalStatus,
    isDemoIntroModalPending,
    isDemoIntroModalVisible,
    closeDemoIntroModal,
    dismissDemoExitError,
    leaveDemoMode
  }
}
