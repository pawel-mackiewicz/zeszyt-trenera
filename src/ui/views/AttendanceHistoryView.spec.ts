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
  let mockDeleteAttendanceListHandle: Mock

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 24, 18, 0, 0))

    mockListAttendanceSessionsByMonthHandle = vi.fn().mockResolvedValue([])
    mockDeleteAttendanceListHandle = vi.fn().mockResolvedValue(undefined)
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
      useCases: {
        deleteAttendanceList: {
          handle: mockDeleteAttendanceListHandle
        }
      } as never
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(AttendanceHistoryView, {
      global: {
        plugins: [createAppI18n(locale)],
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to" :to="to"><slot /></a>'
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

  it('routes each saved session row to the attendance edit screen', async () => {
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(
      wrapper.get('a[to="/attendance/attendance-list-2/edit"]').attributes('to')
    ).toBe('/attendance/attendance-list-2/edit')
  })

  it('renders each session with an edit link and separate trash button', async () => {
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

    const editLinks = wrapper.findAll('.attendance-history__row-link')
    const deleteButtons = wrapper.findAll(
      'button[data-testid^="attendance-delete-"]'
    )

    expect(editLinks).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
    expect(
      wrapper
        .get('button[data-testid="attendance-delete-attendance-list-2"]')
        .element.closest('a')
    ).toBeNull()
  })

  it('does not render the old chevron icon in attendance count cells', async () => {
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(
      wrapper.find('.attendance-history__row-count .app-icon').exists()
    ).toBe(false)
  })

  it('opens a destructive confirmation dialog from the trash button', async () => {
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')

    expect(wrapper.text()).toContain('Usunąć trening?')
    expect(wrapper.text()).toContain('24 października 2026')
    expect(wrapper.text()).toContain('18:00')
    expect(wrapper.text()).toContain('12 osób')
  })

  it('closes the delete confirmation without calling the use case from cancel, backdrop, and Escape', async () => {
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="attendance-delete-cancel"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Usunąć trening?')

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="attendance-delete-backdrop"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Usunąć trening?')

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Usunąć trening?')
    expect(mockDeleteAttendanceListHandle).not.toHaveBeenCalled()
  })

  it('deletes through the application use case, closes the modal, and removes the row', async () => {
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

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="attendance-delete-confirm"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockDeleteAttendanceListHandle).toHaveBeenCalledWith({
      attendanceListId: 'attendance-list-2'
    })
    expect(wrapper.text()).not.toContain('Usunąć trening?')
    expect(wrapper.text()).not.toContain('24 października 2026')
    expect(wrapper.text()).toContain('22 października 2026')
  })

  it('locks delete confirmation actions while deletion is pending', async () => {
    const pendingDelete = {
      resolve: null as null | (() => void)
    }

    mockDeleteAttendanceListHandle.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingDelete.resolve = resolve
        })
    )
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')
    const confirmButton = wrapper.get(
      '[data-testid="attendance-delete-confirm"]'
    )
    const cancelButton = wrapper.get('[data-testid="attendance-delete-cancel"]')
    await confirmButton.trigger('click')
    await flushPromises()

    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(confirmButton.text()).toBe('Usuwanie...')
    expect(cancelButton.attributes('disabled')).toBeDefined()

    if (pendingDelete.resolve === null) {
      throw new Error('Delete promise was not captured')
    }

    pendingDelete.resolve()
    await flushPromises()
  })

  it('keeps the confirmation and row visible with a localized floating error when deletion fails', async () => {
    mockDeleteAttendanceListHandle.mockRejectedValue(new Error('boom'))
    mockListAttendanceSessionsByMonthHandle.mockResolvedValue([
      {
        id: 'attendance-list-2',
        start: new Date(2026, 9, 24, 18, 0, 0),
        attendanceCount: 12
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await wrapper
      .get('button[data-testid="attendance-delete-attendance-list-2"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="attendance-delete-confirm"]')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Usunąć trening?')
    expect(wrapper.text()).toContain('24 października 2026')
    expect(wrapper.text()).toContain('Nie udało się usunąć treningu')
    expect(wrapper.text()).toContain(
      'Spróbuj ponownie. Ten ekran nie usunął jeszcze listy obecności.'
    )
    expect(wrapper.text()).not.toContain('boom')
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
