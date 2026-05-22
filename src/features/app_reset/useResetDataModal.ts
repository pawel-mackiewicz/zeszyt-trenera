import { computed, ref, type Ref } from 'vue'

import {
  normalizeResetConfirmationPhrase,
  RESET_APPLICATION_CONFIRMATION_PHRASE,
  type ResetApplicationDataCommand
} from '@/write/application/requests/ResetApplicationDataCommand'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from '@/features/app_reset/ResetDataModal.contract'

type UseResetDataModalOptions = {
  isShellReady: Readonly<Ref<boolean>>
  onResetApplicationData: (
    command: ResetApplicationDataCommand
  ) => Promise<void> | void
  onReloadApplication: () => Promise<void> | void
}

// What: define one internal status model for the reset workflow. Why: modal rendering and floating-error visibility must stay mutually consistent while async destructive writes are in flight.
const ResetWorkflowStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Error: 'error'
} as const

type ResetWorkflowStatusValue =
  (typeof ResetWorkflowStatus)[keyof typeof ResetWorkflowStatus]

export function useResetDataModal(options: UseResetDataModalOptions) {
  const resetModalVisible = ref(false)
  const resetWorkflowStatus = ref<ResetWorkflowStatusValue>(
    ResetWorkflowStatus.Idle
  )
  const resetConfirmationInput = ref('')
  const resetConfirmationPhrase = RESET_APPLICATION_CONFIRMATION_PHRASE

  const resetInProgress = computed(
    () => resetWorkflowStatus.value === ResetWorkflowStatus.Pending
  )
  const resetErrorVisible = computed(
    () => resetWorkflowStatus.value === ResetWorkflowStatus.Error
  )
  const isResetConfirmationValid = computed(
    () =>
      normalizeResetConfirmationPhrase(resetConfirmationInput.value) ===
      resetConfirmationPhrase
  )
  // What: expose one status value for the presentation component. Why: consolidating visibility and pending-state in one contract keeps the UI API deterministic and testable.
  const resetModalStatus = computed<ResetDataModalStatusValue>(() => {
    if (!options.isShellReady.value || !resetModalVisible.value) {
      return ResetDataModalStatus.Hidden
    }

    return resetInProgress.value
      ? ResetDataModalStatus.Pending
      : ResetDataModalStatus.Ready
  })

  function openResetModal() {
    resetWorkflowStatus.value = ResetWorkflowStatus.Idle
    resetConfirmationInput.value = ''
    resetModalVisible.value = true
  }

  function closeResetModal() {
    // What: lock dismiss interactions while reset writes are in flight. Why: closing during a destructive pending action hides critical context and can trigger duplicate retries.
    if (resetInProgress.value) {
      return
    }

    resetModalVisible.value = false
    resetWorkflowStatus.value = ResetWorkflowStatus.Idle
    resetConfirmationInput.value = ''
  }

  function setResetConfirmationInput(value: string) {
    resetConfirmationInput.value = value
  }

  function dismissResetError() {
    // What: allow dismissing stale reset failures without closing the modal. Why: the coach should be able to correct the phrase and retry immediately in the same context.
    resetWorkflowStatus.value = ResetWorkflowStatus.Idle
  }

  async function confirmResetApplicationData() {
    if (
      !isResetConfirmationValid.value ||
      resetInProgress.value ||
      !resetModalVisible.value
    ) {
      return
    }

    resetWorkflowStatus.value = ResetWorkflowStatus.Pending

    try {
      // What: execute destructive writes through the injected shell callback. Why: this composable must stay UI-only and never bypass the application-layer boundary.
      await options.onResetApplicationData({
        confirmationPhrase: resetConfirmationInput.value
      })
      resetWorkflowStatus.value = ResetWorkflowStatus.Idle
      resetModalVisible.value = false
      resetConfirmationInput.value = ''
      // What: trigger reload after state cleanup without awaiting completion. Why: window reload is fire-and-forget, and awaiting it only delays UI updates in tests and runtime.
      void options.onReloadApplication()
    } catch (error) {
      resetWorkflowStatus.value = ResetWorkflowStatus.Error
      console.error('Failed to reset all local application data.', error)
    }
  }

  return {
    resetModalStatus,
    resetConfirmationPhrase,
    resetConfirmationInput,
    isResetConfirmationValid,
    resetErrorVisible,
    openResetModal,
    closeResetModal,
    setResetConfirmationInput,
    confirmResetApplicationData,
    dismissResetError
  }
}
