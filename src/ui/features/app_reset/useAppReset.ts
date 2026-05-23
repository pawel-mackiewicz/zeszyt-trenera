// i really dont like that state of the app reset - `ResetWorkflowStatus` is in another file, `app-reset.store.ts` - its strange.
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useAppServices } from '@/ui/appServices'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { ResetDataModalStatus } from '@/ui/features/app_reset/ResetDataModal.contract'

export function useAppReset() {
  const appResetStore = useAppResetStore()
  const { useCases } = useAppServices()
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

  async function confirmResetApplicationData() {
    if (!appResetStore.beginResetApplicationData()) {
      return
    }

    try {
      await useCases.resetApplicationData.handle({
        confirmationPhrase: resetConfirmationInput.value
      })
      appResetStore.completeResetApplicationData()
      // What: cold-reload after a successful reset. Why: Pinia and i18n still hold in-memory state after local storage and IndexedDB are cleared.
      window.location.reload()
    } catch (error) {
      appResetStore.failResetApplicationData()
      console.error('Failed to reset all local application data.', error)
    }
  }

  return {
    isResetConfirmationValid,
    isResetModalPending,
    isResetModalVisible,
    resetConfirmationInputModel,
    resetConfirmationPhrase,
    resetErrorVisible,
    closeResetModal: appResetStore.closeResetModal,
    confirmResetApplicationData,
    dismissResetError: appResetStore.dismissResetError
  }
}
