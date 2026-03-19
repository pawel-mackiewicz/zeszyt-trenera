import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import {
  createAppServicesProvides,
  type UiAppServices,
  useAppServices
} from '@/ui/appServices'

describe('uiAppServices', () => {
  it('fails fast when app services were not provided', () => {
    const Probe = defineComponent({
      setup() {
        useAppServices()
        return () => null
      }
    })

    // Surfacing a wiring error during mount is faster to diagnose than letting each view fail later on first submit.
    expect(() => mount(Probe)).toThrowError('App services were not provided.')
  })

  it('returns the provided service bag', () => {
    const handle = vi.fn()
    const appServices: UiAppServices = {
      useCases: {
        registerClub: {
          handle
        },
        registerTrainer: {
          handle
        }
      }
    }

    const Probe = defineComponent({
      setup() {
        expect(useAppServices()).toBe(appServices)
        return () => null
      }
    })

    mount(Probe, {
      global: {
        provide: createAppServicesProvides(appServices)
      }
    })
  })
})
