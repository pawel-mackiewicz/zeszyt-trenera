import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import MonthSelector from '@/ui/components/MonthSelector.vue'
import { createAppI18n } from '@/ui/i18n'
import { useAppServices } from '@/ui/appServices'
import AttendanceHistoryView from '@/ui/views/AttendanceHistoryView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('AttendanceHistoryView', () => {
  let mockListAttendanceSessionsByMonthHandle: Mock

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 24, 18, 0, 0))

    mockListAttendanceSessionsByMonthHandle = vi.fn().mockResolvedValue([])
    const mockObserveMembershipPaymentStatusByMonthHandle = vi.fn()
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        listAttendanceSessionsByMonth: {
          handle: mockListAttendanceSessionsByMonthHandle
        },
        observeMembershipPaymentStatusByMonth: {
          handle: mockObserveMembershipPaymentStatusByMonthHandle
        }
      },
      useCases: {} as never
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(AttendanceHistoryView, {
      global: {
        plugins: [createAppI18n(locale)],
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    })
  }

  it('loads the current month on mount through the shared attendance history query', async () => {
    mountView()
    await flushPromises()

    expect(mockListAttendanceSessionsByMonthHandle).toHaveBeenCalledWith({
      month: new Date(2026, 9, 1)
    })
  })

  it('reloads history when the shared month selector emits a different month', async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper
      .getComponent(MonthSelector)
      .vm.$emit('update:modelValue', new Date(2026, 8, 1))
    await flushPromises()
    wrapper
      .getComponent(MonthSelector)
      .vm.$emit('update:modelValue', new Date(2026, 9, 1))
    await flushPromises()

    expect(mockListAttendanceSessionsByMonthHandle).toHaveBeenNthCalledWith(2, {
      month: new Date(2026, 8, 1)
    })
    expect(mockListAttendanceSessionsByMonthHandle).toHaveBeenNthCalledWith(3, {
      month: new Date(2026, 9, 1)
    })
  })

  it('renders the shared month selector with the current month label', async () => {
    const wrapper = mountView()
    await flushPromises()

    const selector = wrapper.getComponent(MonthSelector)

    expect(selector.text()).toContain('październik 2026')
  })

  it('renders the monthly ledger rows without the analytics section', async () => {
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      },
      {
        id: 'attendance-list-1',
        start: new Date(2026, 9, 22, 19, 30, 0),
        attendanceCount: 18
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('24 października 2026')
    expect(wrapper.text()).toContain('18:00')
    expect(wrapper.text()).toContain('12 osób')
    expect(wrapper.text()).toContain('18 osób')
    expect(wrapper.text()).not.toContain('Analiza miesięczna')
  })

  it('shows the new training link in Polish', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Brak treningów w tym miesiącu')
    expect(wrapper.get('.attendance-history__action-fab a').text()).toBe(
      '+ DODAJ'
    )
    expect(
      wrapper.get('.attendance-history__action-fab a').attributes('to')
    ).toBe('/attendance/new')
  })

  it('shows the new training link in English', async () => {
    const wrapper = mountView('en')
    await flushPromises()

    expect(wrapper.get('.attendance-history__action-fab a').text()).toBe(
      '+ ADD'
    )
  })
})
