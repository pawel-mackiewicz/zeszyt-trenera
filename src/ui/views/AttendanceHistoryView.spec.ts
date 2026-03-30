import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

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
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        listAttendanceSessionsByMonth: {
          handle: mockListAttendanceSessionsByMonthHandle
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
      monthStart: new Date(2026, 9, 1),
      nextMonthStart: new Date(2026, 10, 1)
    })
  })

  it('changes the selected month when the period arrows are used', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#attendance-history-prev-month').trigger('click')
    await flushPromises()
    await wrapper.get('#attendance-history-next-month').trigger('click')
    await flushPromises()

    expect(mockListAttendanceSessionsByMonthHandle).toHaveBeenNthCalledWith(2, {
      monthStart: new Date(2026, 8, 1),
      nextMonthStart: new Date(2026, 9, 1)
    })
    expect(mockListAttendanceSessionsByMonthHandle).toHaveBeenNthCalledWith(3, {
      monthStart: new Date(2026, 9, 1),
      nextMonthStart: new Date(2026, 10, 1)
    })
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

  it('shows the empty month state with a direct link to start a new training', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Brak treningów w tym miesiącu')
    expect(wrapper.text()).toContain('Nowy trening')
    expect(wrapper.html()).toContain('/attendance/new')
  })
})
