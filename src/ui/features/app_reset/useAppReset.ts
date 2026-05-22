import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { ResetDataModalStatus } from '@/ui/features/app_reset/ResetDataModal.contract'

export function useAppReset() {
  const appResetStore = useAppResetStore()
  const {
    resetModalStatus,
    resetConfirmationPhrase,
    resetConfirmationInput,
    isResetConfirmationValid,
    resetErrorVisible
  } = storeToRefs(appResetStore)

  // What: expose modal-ready flags from the reset feature. Why: AppShell should only place the overlay, while this feature owns destructive reset state interpretation.
  const isResetModalVisible = computed(
    () => resetModalStatus.value !== ResetDataModalStatus.Hidden
  )
  const isResetModalPending = computed(
    () => resetModalStatus.value === ResetDataModalStatus.Pending
  )
  const resetConfirmationInputModel = computed({
    get: () => resetConfirmationInput.value,
    set: (value: string) => appResetStore.setResetConfirmationInput(value)
  })

  return {
    isResetConfirmationValid,
    isResetModalPending,
    isResetModalVisible,
    resetConfirmationInputModel,
    resetConfirmationPhrase,
    resetErrorVisible,
    closeResetModal: appResetStore.closeResetModal,
    confirmResetApplicationData: appResetStore.confirmResetApplicationData,
    dismissResetError: appResetStore.dismissResetError
  }
}
