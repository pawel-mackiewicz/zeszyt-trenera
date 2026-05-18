import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useShellStore } from '@/ui/stores/shell.store'

describe('useShellStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens and closes the drawer through explicit shell actions', () => {
    const store = useShellStore()

    store.openDrawer()
    expect(store.drawerOpen).toBe(true)

    store.closeDrawer()
    expect(store.drawerOpen).toBe(false)
  })

  it('toggles the drawer visibility for shared header interactions', () => {
    const store = useShellStore()

    store.toggleDrawer()
    expect(store.drawerOpen).toBe(true)

    store.toggleDrawer()
    expect(store.drawerOpen).toBe(false)
  })
})
