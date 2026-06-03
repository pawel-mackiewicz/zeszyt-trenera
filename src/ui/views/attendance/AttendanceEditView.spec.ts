import { flushPromises, mount } from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock
} from 'vitest'

import { createAppI18n } from '@/ui/i18n.ts'
import { useAppServices } from '@/ui/appServices.ts'
import { useRoute, useRouter } from '@/ui/router/runtime.ts'
import AttendanceEditView from '@/ui/views/attendance/AttendanceEditView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

vi.mock('@/ui/router/runtime', async () => {
  const actual = await vi.importActual('@/ui/router/runtime')

  return {
    ...actual,
    useRoute: vi.fn(),
    useRouter: vi.fn()
  }
})

describe('AttendanceEditView', () => {
  let mockGetAttendanceSessionByIdHandle: Mock
  let mockListMembersForAttendanceEditorHandle: Mock
  let mockUpdateAttendanceListHandle: Mock
  let mockRouterReplace: Mock

  beforeEach(() => {
    vi.useRealTimers()
    mockGetAttendanceSessionByIdHandle = vi.fn().mockResolvedValue({
      id: 'attendance-list-1',
      memberIds: ['member-1'],
      start: new Date(2026, 2, 27, 18, 0, 0)
    })
    mockListMembersForAttendanceEditorHandle = vi.fn().mockResolvedValue([])
    mockUpdateAttendanceListHandle = vi.fn().mockResolvedValue(undefined)
    mockRouterReplace = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useRoute).mockReturnValue({
      params: {
        attendanceListId: 'attendance-list-1'
      }
    } as never)
    vi.mocked(useRouter).mockReturnValue({
      replace: mockRouterReplace
    } as never)
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        getAttendanceSessionById: {
          handle: mockGetAttendanceSessionByIdHandle
        },
        listMembersForAttendanceEditor: {
          handle: mockListMembersForAttendanceEditorHandle
        }
      },
      useCases: {
        updateAttendanceList: {
          handle: mockUpdateAttendanceListHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(AttendanceEditView, {
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

  function memberRow(wrapper: ReturnType<typeof mountView>, fullName: string) {
    const row = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes(fullName))

    if (!row) {
      throw new Error(`Member row not found for ${fullName}`)
    }

    return row
  }

  function saveButton(wrapper: ReturnType<typeof mountView>) {
    const button = wrapper
      .findAll('button')
      .find((buttonWrapper) =>
        /Save changes|Zapisz zmiany/.test(buttonWrapper.text())
      )

    if (!button) {
      throw new Error('Save changes button not found')
    }

    return button
  }

  it('hydrates the editor from one saved attendance session', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Amanda',
        lastName: 'Nunes',
        age: 37
      },
      {
        id: 'member-2',
        firstName: 'Valentina',
        lastName: 'Shevchenko',
        age: 28
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(mockGetAttendanceSessionByIdHandle).toHaveBeenCalledWith({
      attendanceListId: 'attendance-list-1'
    })
    expect(wrapper.find('#attendance-session-date-trigger').text()).toContain(
      '27 marca 2026'
    )
    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '18:00'
    )
    expect(memberRow(wrapper, 'Amanda Nunes').classes()).toContain(
      'attendance-member-row--selected'
    )
  })

  it('submits attendance edits through the application layer and returns to history', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Amanda',
        lastName: 'Nunes',
        age: 37
      },
      {
        id: 'member-2',
        firstName: 'Valentina',
        lastName: 'Shevchenko',
        age: 28
      }
    ])

    const wrapper = mountView('en')
    await flushPromises()

    await memberRow(wrapper, 'Valentina Shevchenko').trigger('click')
    await wrapper.find('#attendance-session-time-trigger').trigger('click')
    await wrapper.find('#attendance-time').setValue('18:30')
    await saveButton(wrapper).trigger('click')

    expect(mockUpdateAttendanceListHandle).toHaveBeenCalledWith({
      attendanceListId: 'attendance-list-1',
      memberIds: ['member-1', 'member-2'],
      start: new Date(2026, 2, 27, 18, 30)
    })
    expect(mockRouterReplace).toHaveBeenCalledWith('/attendance')
  })

  it('shows a fallback state when the saved attendance session no longer exists', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])
    mockGetAttendanceSessionByIdHandle.mockResolvedValue(null)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Wybrany trening nie istnieje już w historii.'
    )
    expect(wrapper.get('a[to="/attendance"]').attributes('to')).toBe(
      '/attendance'
    )
  })

  it('disables save when the local member roster cannot be loaded', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    mockListMembersForAttendanceEditorHandle.mockRejectedValue(
      new Error('offline')
    )

    const wrapper = mountView('en')
    await flushPromises()

    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

    consoleErrorSpy.mockRestore()
  })
})
