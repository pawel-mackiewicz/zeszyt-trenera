import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import AppShell from '@/ui/components/AppShell.vue'
import { createAppServicesProvides, type UiAppServices } from '@/ui/appServices'
import { createMemoryHistory, createRouter } from '@/ui/router/runtime'
import HomeView from '@/ui/views/HomeView.vue'
import { useAppStore } from '@/ui/stores/app'

vi.mock('@/ui/pwa/register', () => ({
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

    // The shell renders routed views, so tests provide the same shared services seam that production bootstrap installs once.
    const appServices: UiAppServices = {
      useCases: {
        registerClub: {
          handle: vi.fn()
        }
      }
    }

    const wrapper = mount(AppShell, {
      global: {
        provide: createAppServicesProvides(appServices),
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('Install app')
    expect(wrapper.text()).toContain('Update now')
    expect(wrapper.text()).toContain('Dexie wired')
  })
})
