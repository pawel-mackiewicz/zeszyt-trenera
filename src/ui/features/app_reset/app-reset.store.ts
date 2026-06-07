import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  normalizeResetConfirmationPhrase,
  RESET_APPLICATION_CONFIRMATION_PHRASE
} from '@/system_management/app_reset/application/requests/ResetApplicationDataCommand'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from '@/ui/features/app_reset/ResetDataModal.contract'
import { useAppStore } from '@/ui/stores/app'

export const ResetWorkflowStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Error: 'error'
} as const

export type ResetWorkflowStatusValue =
  (typeof ResetWorkflowStatus)[keyof typeof ResetWorkflowStatus]

export const useAppResetStore = defineStore('appReset', () => {
  const appStore = useAppStore()
  const resetModalVisible = ref(false)
  // What: keep destructive reset workflow status in Pinia. Why: modal placement and retry feedback need one shared state source while write calls stay outside the store.
  const resetWorkflowStatus = ref<ResetWorkflowStatusValue>(
    ResetWorkflowStatus.Idle
  )
  const resetConfirmationInput = ref('')
  const resetConfirmationPhrase = ref(RESET_APPLICATION_CONFIRMATION_PHRASE)

  const resetInProgress = computed(
    () => resetWorkflowStatus.value === ResetWorkflowStatus.Pending
  )
  const resetErrorVisible = computed(
    () => resetWorkflowStatus.value === ResetWorkflowStatus.Error
  )
  const isResetConfirmationValid = computed(
    () =>
      normalizeResetConfirmationPhrase(resetConfirmationInput.value) ===
      resetConfirmationPhrase.value
  )
  const canConfirmReset = computed(
    () =>
      isResetConfirmationValid.value &&
      !resetInProgress.value &&
      resetModalVisible.value
  )
  const isShellReady = computed(
    () => appStore.appReadiness === 'ready' && appStore.setupStatus === 'ready'
  )
  const resetModalStatus = computed<ResetDataModalStatusValue>(() => {
    if (!isShellReady.value || !resetModalVisible.value) {
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
    // What: keep the destructive reset context visible while the application use case is running. Why: hiding pending state invites duplicate taps and makes local-first recovery harder to reason about.
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
    resetWorkflowStatus.value = ResetWorkflowStatus.Idle
  }

  // What: expose guarded reset transitions without touching services. Why: useAppReset should own the write-layer call while every UI surface shares the same pending/error state.
  function beginResetApplicationData() {
    if (!canConfirmReset.value) {
      return false
    }

    resetWorkflowStatus.value = ResetWorkflowStatus.Pending
    return true
  }

  function completeResetApplicationData() {
    resetWorkflowStatus.value = ResetWorkflowStatus.Idle
    resetModalVisible.value = false
    resetConfirmationInput.value = ''
  }

  function failResetApplicationData() {
    resetWorkflowStatus.value = ResetWorkflowStatus.Error
  }

  return {
    resetModalVisible,
    resetWorkflowStatus,
    resetModalStatus,
    resetConfirmationPhrase,
    resetConfirmationInput,
    canConfirmReset,
    isResetConfirmationValid,
    resetInProgress,
    resetErrorVisible,
    openResetModal,
    closeResetModal,
    setResetConfirmationInput,
    beginResetApplicationData,
    completeResetApplicationData,
    failResetApplicationData,
    dismissResetError
  }
})
