import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import AppShell from '@/components/AppShell.vue'
import { createMemoryHistory, createRouter } from '@/router/runtime'
import HomeView from '@/views/HomeView.vue'
import { useAppStore } from '@/stores/app'

vi.mock('@/pwa/register', () => ({
  registerPwa: () => ({
    needRefresh: ref(true),
    offlineReady: ref(false),
    updateServiceWorker: vi.fn()
  })
}))

describe('AppShell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders install and update actions based on store state', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: HomeView,
          meta: {
            title: 'Home',
            eyebrow: 'Test',
            summary: 'Testing shell actions.',
            navLabel: 'Home'
          }
        }
      ]
    })

    await router.push('/')
    await router.isReady()

    const store = useAppStore()
    store.setInstallAvailability(true)
    store.setDbConnected(true)

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('Install app')
    expect(wrapper.text()).toContain('Update now')
    expect(wrapper.text()).toContain('Dexie wired')
  })
})
