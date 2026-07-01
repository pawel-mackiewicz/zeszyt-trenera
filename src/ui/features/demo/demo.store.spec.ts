import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { DemoIntroModalPath, useDemoStore } from '@/ui/features/demo/demo.store'

describe('useDemoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks demo-mode visibility separately from normal shell readiness', () => {
    const store = useDemoStore()

    store.setDemoModeActive(true)
    store.showDemoIntroModal()

    expect(store.demoModeActive).toBe(true)
    expect(store.demoIntroModalVisible).toBe(true)
    expect(store.demoIntroModalPath).toBe(DemoIntroModalPath.Startup)
  })

  it('remembers when the coach opens the start-for-real path', () => {
    const store = useDemoStore()

    store.setDemoModeActive(true)
    store.showDemoIntroModal(DemoIntroModalPath.Exit)

    expect(store.demoIntroModalVisible).toBe(true)
    expect(store.demoIntroModalPath).toBe(DemoIntroModalPath.Exit)
  })

  it('clears the intro modal when demo mode turns off', () => {
    const store = useDemoStore()

    store.setDemoModeActive(true)
    store.showDemoIntroModal()
    store.setDemoModeActive(false)

    expect(store.demoModeActive).toBe(false)
    expect(store.demoIntroModalVisible).toBe(false)
  })
})
