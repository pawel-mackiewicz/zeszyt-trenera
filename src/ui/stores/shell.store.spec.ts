import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useShellStore } from '@/ui/stores/shell.store'

describe('useShellStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens and closes the sidebar through explicit shell actions', () => {
    const store = useShellStore()

    store.openSidebar()
    expect(store.sidebarOpen).toBe(true)

    store.closeSidebar()
    expect(store.sidebarOpen).toBe(false)
  })

  it('toggles the sidebar visibility for shared header interactions', () => {
    const store = useShellStore()

    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(true)

    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(false)
  })
})
