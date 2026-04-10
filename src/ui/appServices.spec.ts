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
    // eslint-disable-next-line vue/one-component-per-file -- What: keep this spec-local probe beside the assertion it drives. Why: colocated harnesses make provider wiring failures easier to read and change without promoting throwaway test components into shared UI code.
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
    const observeHandle = vi.fn()
    const appServices: UiAppServices = {
      queries: {
        getAttendanceSessionById: {
          handle
        },
        listAttendanceSessionsByMonth: {
          handle
        },
        observeMembershipPaymentStatusByMonth: {
          handle: observeHandle
        },
        observeSetupStatus: {
          handle: observeHandle
        }
      },
      useCases: {
        bootstrapDemoMode: {
          handle
        },
        deliverDatabaseBackup: {
          handle
        },
        exportDatabaseBackup: {
          handle
        },
        importDatabaseBackup: {
          handle
        },
        leaveDemoMode: {
          handle
        },
        registerAttendanceList: {
          handle
        },
        registerClub: {
          handle
        },
        registerMember: {
          handle
        },
        registerMembershipPayment: {
          handle
        },
        registerTrainer: {
          handle
        },
        resetApplicationData: {
          handle
        },
        sendMembershipPaymentReminder: {
          handle
        },
        updateAttendanceList: {
          handle
        },
        updateMember: {
          handle
        }
      }
    }

    // eslint-disable-next-line vue/one-component-per-file -- What: keep this second probe inline with the happy-path service-bag assertion. Why: these tiny one-off test harnesses document intent better than extracting artificial shared components for a spec-only scenario.
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
