import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { registerPwa } from '@/ui/pwa/register'
import { useAppUpdateStore } from '@/ui/stores/app-update.store'

vi.mock('@/ui/pwa/register', () => ({
  registerPwa: vi.fn()
}))

function createDeferredPromise() {
  let resolve!: () => void

  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })

  return {
    promise,
    resolve
  }
}

describe('useAppUpdateStore', () => {
  let needRefresh: Ref<boolean>
  let updateServiceWorker: Mock

  beforeEach(() => {
    setActivePinia(createPinia())
    needRefresh = ref(false)
    updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    vi.mocked(registerPwa).mockReset()
    vi.mocked(registerPwa).mockReturnValue({
      needRefresh,
      offlineReady: ref(false),
      updateServiceWorker
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('registers the service worker immediately without activating the waiting shell', () => {
    const store = useAppUpdateStore()

    store.registerUpdateChecks()

    expect(registerPwa).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onRegisterError: expect.any(Function)
      })
    )
    expect(store.updateAvailable).toBe(false)
    expect(store.updatePending).toBe(false)
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('does not duplicate service-worker registration on repeated calls', () => {
    const store = useAppUpdateStore()

    store.registerUpdateChecks()
    store.registerUpdateChecks()

    // What: assert the internal registration guard. Why: multiple shell consumers must be able to request update checks without creating competing PWA plugin registrations.
    expect(registerPwa).toHaveBeenCalledTimes(1)
  })

  it('exposes update availability from the PWA registration ref', async () => {
    const store = useAppUpdateStore()

    store.registerUpdateChecks()
    needRefresh.value = true
    await nextTick()

    expect(store.updateAvailable).toBe(true)
  })

  it('sets pending while activating a waiting update', async () => {
    const deferredUpdate = createDeferredPromise()
    updateServiceWorker.mockReturnValueOnce(deferredUpdate.promise)
    const store = useAppUpdateStore()

    store.registerUpdateChecks()
    const activationPromise = store.activateWaitingUpdate()

    expect(store.updatePending).toBe(true)
    expect(updateServiceWorker).toHaveBeenCalledWith(true)

    deferredUpdate.resolve()
    await activationPromise

    expect(store.updatePending).toBe(false)
  })

  it('stores registration errors as safe update error kinds', () => {
    const store = useAppUpdateStore()

    store.registerUpdateChecks()
    const options = vi.mocked(registerPwa).mock.calls[0]?.[0]

    options?.onRegisterError?.(new Error('registration failed'))

    expect(store.updateError).toEqual({
      kind: 'registration'
    })
  })

  it('stores activation errors as safe update error kinds', async () => {
    const activationError = new Error('activation failed')
    updateServiceWorker.mockRejectedValueOnce(activationError)
    const store = useAppUpdateStore()

    store.registerUpdateChecks()
    await store.activateWaitingUpdate()

    expect(store.updatePending).toBe(false)
    expect(store.updateError).toEqual({
      kind: 'activation'
    })
  })

  it('clears update errors', () => {
    const store = useAppUpdateStore()

    store.registerUpdateChecks()
    vi.mocked(registerPwa).mock.calls[0]?.[0]?.onRegisterError?.(
      new Error('registration failed')
    )
    store.clearUpdateError()

    expect(store.updateError).toBeNull()
  })
})
