import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { registerPwa } from '@/ui/pwa/register'
import { useAppStore } from '@/ui/stores/app'

vi.mock('@/ui/pwa/register', () => ({
  registerPwa: vi.fn()
}))

describe('useAppUpdate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(registerPwa).mockReset()
  })

  it('registers the service worker immediately without forcing an in-session activation', () => {
    const updateServiceWorker = vi.fn()

    vi.mocked(registerPwa).mockReturnValue({
      needRefresh: ref(false),
      offlineReady: ref(false),
      updateServiceWorker
    })

    const result = useAppUpdate()

    expect(registerPwa).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onRegisterError: expect.any(Function)
      })
    )
    expect(result.needRefresh.value).toBe(false)
    expect(result.updatePending.value).toBe(false)
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('stores registration errors so offline issues stay visible', () => {
    vi.mocked(registerPwa).mockReturnValue({
      needRefresh: ref(false),
      offlineReady: ref(false),
      updateServiceWorker: vi.fn()
    })

    useAppUpdate()

    const options = vi.mocked(registerPwa).mock.calls[0]?.[0]
    const store = useAppStore()

    options?.onRegisterError?.(new Error('boom'))
    expect(store.updateError).toEqual({
      kind: 'registration',
      detail: 'boom'
    })

    options?.onRegisterError?.('unknown')
    expect(store.updateError).toEqual({
      kind: 'registration',
      detail: null
    })
  })

  it('activates a waiting shell only after an explicit menu action and resets pending state after success', async () => {
    let resolveUpdate: (() => void) | undefined
    const updateServiceWorker = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve
        })
    )

    vi.mocked(registerPwa).mockReturnValue({
      needRefresh: ref(true),
      offlineReady: ref(false),
      updateServiceWorker
    })

    const result = useAppUpdate()
    const refreshPromise = result.refreshApplication()

    expect(result.updatePending.value).toBe(true)
    expect(updateServiceWorker).toHaveBeenCalledWith(true)

    resolveUpdate?.()
    await refreshPromise

    expect(result.updatePending.value).toBe(false)
  })

  it('stores activation errors so the shell can explain why the update did not apply', async () => {
    vi.mocked(registerPwa).mockReturnValue({
      needRefresh: ref(true),
      offlineReady: ref(false),
      updateServiceWorker: vi
        .fn()
        .mockRejectedValue(new Error('activation failed'))
    })

    const store = useAppStore()
    store.setUpdateError({
      kind: 'registration',
      detail: 'old error'
    })

    const result = useAppUpdate()

    await result.refreshApplication()

    expect(store.updateError).toEqual({
      kind: 'activation',
      detail: 'activation failed'
    })
    expect(result.updatePending.value).toBe(false)
  })
})
