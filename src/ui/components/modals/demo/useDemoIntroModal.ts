import { computed, ref, type Ref } from 'vue'

import {
  DemoIntroModalStatus,
  type DemoIntroModalStatusValue
} from '@/ui/components/modals/demo/DemoIntroModal.contract'

type UseDemoIntroModalOptions = {
  isShellReady: Readonly<Ref<boolean>>
  demoIntroModalVisible: Readonly<Ref<boolean>>
  showDemoIntroModal: () => void
  dismissDemoIntroModal: () => void
  onLeaveDemoMode: () => Promise<void>
}

// What: define one internal status model for the demo-exit workflow. Why: the modal state and floating error must stay mutually consistent while async leave requests are running on mobile connections.
const DemoExitStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Error: 'error'
} as const
type DemoExitStatusValue = (typeof DemoExitStatus)[keyof typeof DemoExitStatus]

export function useDemoIntroModal(options: UseDemoIntroModalOptions) {
  const demoExitStatus = ref<DemoExitStatusValue>(DemoExitStatus.Idle)

  const demoExitInProgress = computed(
    () => demoExitStatus.value === DemoExitStatus.Pending
  )
  const demoExitErrorVisible = computed(
    () => demoExitStatus.value === DemoExitStatus.Error
  )
  // What: expose one modal status contract for the presentation component. Why: the shell should pass one explicit UI state instead of syncing separate active and pending booleans.
  const demoIntroModalStatus = computed<DemoIntroModalStatusValue>(() => {
    if (!options.isShellReady.value || !options.demoIntroModalVisible.value) {
      return DemoIntroModalStatus.Hidden
    }

    return demoExitInProgress.value
      ? DemoIntroModalStatus.Pending
      : DemoIntroModalStatus.Ready
  })

  function openDemoIntroModal() {
    demoExitStatus.value = DemoExitStatus.Idle
    options.showDemoIntroModal()
  }

  function closeDemoIntroModal() {
    if (demoExitInProgress.value) {
      return
    }

    demoExitStatus.value = DemoExitStatus.Idle
    options.dismissDemoIntroModal()
  }

  function dismissDemoExitError() {
    // What: allow dismissing stale leave-demo failures while keeping the intro modal mounted. Why: retrying the transition should not require closing and reopening the modal first.
    demoExitStatus.value = DemoExitStatus.Idle
  }

  async function leaveDemoMode() {
    if (demoExitStatus.value === DemoExitStatus.Pending) {
      return
    }

    demoExitStatus.value = DemoExitStatus.Pending

    try {
      // What: execute the injected leave-demo callback and only update local status here. Why: shell-level orchestration owns global store transitions while this composable stays focused on modal UI state.
      await options.onLeaveDemoMode()
      demoExitStatus.value = DemoExitStatus.Idle
    } catch (error) {
      demoExitStatus.value = DemoExitStatus.Error
      console.error('Failed to leave demo mode.', error)
    }
  }

  return {
    demoIntroModalStatus,
    demoExitErrorVisible,
    openDemoIntroModal,
    closeDemoIntroModal,
    dismissDemoExitError,
    leaveDemoMode
  }
}
