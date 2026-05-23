import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { ResetDataModalStatus } from '@/ui/features/app_reset/ResetDataModal.contract.ts'
import { useAppStore } from '@/ui/stores/app.ts'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store.ts'

function prepareReadyShell() {
  const appStore = useAppStore()

  appStore.setAppReady()
  appStore.setSetupStatus('ready')
}

describe('useAppResetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    prepareReadyShell()
  })

  it('opens and closes modal state', () => {
    const store = useAppResetStore()

    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Hidden)

    store.openResetModal()
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Ready)

    store.setResetConfirmationInput('DELETE ALL DATA')
    store.closeResetModal()

    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Hidden)
    expect(store.resetConfirmationInput).toBe('')
  })

  it('validates the confirmation phrase case-insensitively', () => {
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('delete all data')

    expect(store.isResetConfirmationValid).toBe(true)

    store.setResetConfirmationInput('delete all member data')

    expect(store.isResetConfirmationValid).toBe(false)
  })

  it('blocks close while reset is pending', () => {
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    store.beginResetApplicationData()

    store.closeResetModal()

    // What: verify pending reset stays visible. Why: destructive application-layer writes are started by the composable, but the shared store still owns the modal lock.
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Pending)
  })

  it('starts reset only when the modal is open and confirmation is valid', () => {
    const store = useAppResetStore()

    expect(store.beginResetApplicationData()).toBe(false)

    store.openResetModal()
    store.setResetConfirmationInput('delete everything')

    expect(store.beginResetApplicationData()).toBe(false)

    store.setResetConfirmationInput('DELETE ALL DATA')

    expect(store.beginResetApplicationData()).toBe(true)
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Pending)
    expect(store.canConfirmReset).toBe(false)
  })

  it('clears modal state after successful reset completion', () => {
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    store.beginResetApplicationData()
    store.completeResetApplicationData()

    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Hidden)
    expect(store.resetConfirmationInput).toBe('')
    expect(store.resetErrorVisible).toBe(false)
  })

  it('keeps error visible after failed reset', () => {
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    store.beginResetApplicationData()
    store.failResetApplicationData()

    expect(store.resetErrorVisible).toBe(true)
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Ready)

    store.dismissResetError()
    expect(store.resetErrorVisible).toBe(false)
  })
})
