import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  normalizeResetConfirmationPhrase,
  RESET_APPLICATION_CONFIRMATION_PHRASE
} from '@/write/application/requests/ResetApplicationDataCommand'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from '@/features/app_reset/ResetDataModal.contract'
import { useAppServices } from '@/ui/appServices'
import { useAppStore } from '@/ui/stores/app'

const ResetWorkflowStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Error: 'error'
} as const

type ResetWorkflowStatusValue =
  (typeof ResetWorkflowStatus)[keyof typeof ResetWorkflowStatus]

export const useAppResetStore = defineStore('appReset', () => {
  const appStore = useAppStore()
  const { useCases } = useAppServices()
  const resetModalVisible = ref(false)
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
      // What: keep full-reset writes behind the application layer. Why: the shell must never bypass the reset use case when clearing local PWA data.
      await useCases.resetApplicationData.handle({
        confirmationPhrase: resetConfirmationInput.value
      })
      resetWorkflowStatus.value = ResetWorkflowStatus.Idle
      resetModalVisible.value = false
      resetConfirmationInput.value = ''
      // What: cold-reload after a successful reset. Why: Pinia and i18n still hold in-memory state after local storage and IndexedDB are cleared.
      window.location.reload()
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
})
