import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { ATTENDANCE_DRAFT_STORAGE_KEY } from '@/appStorageKeys.ts'
import { AttendanceListAlreadyExistsError } from '@/write/attendance/domain/AttendanceList.ts'
import { createAppI18n } from '@/ui/i18n.ts'
import { useAppServices } from '@/ui/appServices.ts'
import { useRouter } from '@/ui/router/runtime.ts'
import AttendanceListView from '@/ui/views/attendance/AttendanceListView.vue'

vi.mock('@/ui/router/runtime', () => ({
  useRouter: vi.fn()
}))

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('AttendanceListView', () => {
  let mockRegisterAttendanceListHandle: Mock
  let mockListMembersForAttendanceEditorHandle: Mock
  let mockRouterPush: Mock

  beforeEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
    mockListMembersForAttendanceEditorHandle = vi.fn().mockResolvedValue([])
    mockRouterPush = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)
    mockRegisterAttendanceListHandle = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        listMembersForAttendanceEditor: {
          handle: mockListMembersForAttendanceEditorHandle
        } as unknown
      },
      useCases: {
        registerAttendanceList: {
          handle: mockRegisterAttendanceListHandle
        } as unknown
      }
    } as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(AttendanceListView, {
      global: {
        plugins: [createAppI18n(locale)]
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
        /Save attendance|Zapisz obecność/.test(buttonWrapper.text())
      )

    if (!button) {
      throw new Error('Save button not found')
    }

    return button
  }

  function memberNamesInOrder(wrapper: ReturnType<typeof mountView>) {
    return wrapper
      .findAll('.attendance-member-row .font-headline')
      .map((nameWrapper) => nameWrapper.text())
  }

  function findButtonByText(
    wrapper: ReturnType<typeof mountView>,
    text: string
  ) {
    const button = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes(text))

    if (!button) {
      throw new Error(`Button not found for text: ${text}`)
    }

    return button
  }

  function readStoredDraft() {
    const value = window.localStorage.getItem(ATTENDANCE_DRAFT_STORAGE_KEY)

    return value ? (JSON.parse(value) as Record<string, unknown>) : null
  }

  async function setSessionField(
    wrapper: ReturnType<typeof mountView>,
    field: 'date' | 'time',
    value: string
  ) {
    const triggerId =
      field === 'date'
        ? '#attendance-session-date-trigger'
        : '#attendance-session-time-trigger'
    const inputId = field === 'date' ? '#attendance-date' : '#attendance-time'

    // What: drive the session editor through the heading triggers. Why: the screen now edits training metadata in place from the header, so the spec should guard that mobile-first interaction.
    await wrapper.find(triggerId).trigger('click')
    await wrapper.find(inputId).setValue(value)
  }

  it('renders loading copy from the local English dictionary', () => {
    mockListMembersForAttendanceEditorHandle.mockImplementation(
      () => new Promise(() => undefined) as never
    )

    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('Loading members...')
    expect(wrapper.find('#attendance-search').attributes('placeholder')).toBe(
      'Enter first and last name'
    )
    expect(wrapper.text()).not.toContain(
      'Choose the training date and time, then mark the attending members from the local member list.'
    )
  })

  it('disables save while members are still loading and ignores submit attempts', async () => {
    mockListMembersForAttendanceEditorHandle.mockImplementation(
      () => new Promise(() => undefined) as never
    )

    const wrapper = mountView()
    const button = saveButton(wrapper)

    expect(button.attributes('disabled')).toBeDefined()

    await button.trigger('click')

    expect(mockRegisterAttendanceListHandle).not.toHaveBeenCalled()
  })

  it('disables save when member loading fails and ignores submit attempts', async () => {
    const loadError = new Error('offline')
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    mockListMembersForAttendanceEditorHandle.mockRejectedValue(loadError)

    const wrapper = mountView()
    await flushPromises()

    const button = saveButton(wrapper)

    expect(button.attributes('disabled')).toBeDefined()

    await button.trigger('click')

    expect(mockRegisterAttendanceListHandle).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('filters members by search query and shared age range rules', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      },
      {
        id: 'member-2',
        firstName: 'Royce',
        lastName: 'Gracie',
        age: 56
      },
      {
        id: 'member-3',
        firstName: 'Mystery',
        lastName: 'Member',
        age: 18
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Mystery Member')
    expect(wrapper.text()).toContain('Wiek 18')

    await wrapper.find('#attendance-search').setValue('Anderson')

    expect(wrapper.text()).toContain('Anderson Silva')
    expect(wrapper.text()).not.toContain('Royce Gracie')

    await wrapper.find('#attendance-search').setValue('')
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue('60')
    await sliders[1].setValue('30')
    await flushPromises()

    expect(wrapper.text()).toContain('Anderson Silva')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).not.toContain('Mystery Member')

    vi.useRealTimers()
  })

  it('edits the training date and time from the session header', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    await setSessionField(wrapper, 'date', '2026-03-27')
    await setSessionField(wrapper, 'time', '18:30')

    expect(wrapper.find('#attendance-session-date-trigger').text()).toContain(
      '27 marca 2026'
    )
    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '18:30'
    )
    expect(wrapper.text()).not.toContain('Status')
    expect(wrapper.text()).not.toContain(
      'Wybierz datę i godzinę treningu, a potem zaznacz obecnych zawodników z lokalnej listy członków.'
    )
  })

  it('keeps the session time editor on a 15-minute grid', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('#attendance-session-time-trigger').trigger('click')

    const timeInput = wrapper.find('#attendance-time')

    expect(timeInput.attributes('step')).toBe('900')

    await timeInput.setValue('18:07')

    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '18:00'
    )
  })

  it('shows a centered recovery dialog when an unsaved draft exists locally', async () => {
    window.localStorage.setItem(
      ATTENDANCE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sessionDate: '2026-03-27',
        sessionTime: '18:30',
        selectedMemberIds: ['member-1']
      })
    )
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    const recoveryDialog = wrapper.find('[role="dialog"]')

    expect(recoveryDialog.exists()).toBe(true)
    expect(recoveryDialog.text()).toContain('Masz niezapisaną listę obecności')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('does not show the recovery dialog for an empty stored draft', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 28, 7, 15, 0))
    window.localStorage.setItem(
      ATTENDANCE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sessionDate: '2026-03-27',
        sessionTime: '18:30',
        selectedMemberIds: []
      })
    )
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('#attendance-session-date-trigger').text()).toContain(
      '28 marca 2026'
    )
    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '07:15'
    )
  })

  it('restores the saved draft and prunes members that no longer exist', async () => {
    window.localStorage.setItem(
      ATTENDANCE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sessionDate: '2026-03-27',
        sessionTime: '18:30',
        selectedMemberIds: ['member-1', 'member-missing']
      })
    )
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      },
      {
        id: 'member-2',
        firstName: 'Amanda',
        lastName: 'Nunes',
        age: 37
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await findButtonByText(wrapper, 'Wróć do listy').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('#attendance-session-date-trigger').text()).toContain(
      '27 marca 2026'
    )
    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '18:30'
    )
    expect(memberRow(wrapper, 'Anderson Silva').classes()).toContain(
      'attendance-member-row--selected'
    )
    expect(memberRow(wrapper, 'Amanda Nunes').classes()).not.toContain(
      'attendance-member-row--selected'
    )
    expect(readStoredDraft()).toEqual({
      sessionDate: '2026-03-27',
      sessionTime: '18:30',
      selectedMemberIds: ['member-1']
    })
  })

  it('removes the saved draft from localStorage when the coach chooses a new list', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 28, 7, 15, 0))
    window.localStorage.setItem(
      ATTENDANCE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sessionDate: '2026-03-27',
        sessionTime: '18:30',
        selectedMemberIds: ['member-1']
      })
    )
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await findButtonByText(wrapper, 'Nowa lista').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('#attendance-session-date-trigger').text()).toContain(
      '28 marca 2026'
    )
    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '07:15'
    )
    expect(memberRow(wrapper, 'Anderson Silva').classes()).not.toContain(
      'attendance-member-row--selected'
    )
    expect(readStoredDraft()).toBeNull()
  })

  it('moves marked members to the top of the list', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Amanda',
        lastName: 'Nunes',
        age: 37
      },
      {
        id: 'member-2',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(memberNamesInOrder(wrapper)).toEqual([
      'Amanda Nunes',
      'Anderson Silva'
    ])

    await memberRow(wrapper, 'Anderson Silva').trigger('click')

    expect(memberNamesInOrder(wrapper)).toEqual([
      'Anderson Silva',
      'Amanda Nunes'
    ])
  })

  it('submits the selected members with the local session start', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      },
      {
        id: 'member-2',
        firstName: 'Amanda',
        lastName: 'Nunes',
        age: 37
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await setSessionField(wrapper, 'date', '2026-03-27')
    await setSessionField(wrapper, 'time', '18:30')
    await memberRow(wrapper, 'Amanda Nunes').trigger('click')
    await memberRow(wrapper, 'Anderson Silva').trigger('click')
    await saveButton(wrapper).trigger('click')

    expect(mockRegisterAttendanceListHandle).toHaveBeenCalledWith({
      memberIds: ['member-2', 'member-1'],
      start: new Date(2026, 2, 27, 18, 30)
    })
  })

  it('persists the unsaved draft while the coach edits the attendance list', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 28, 7, 15, 0))
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      },
      {
        id: 'member-2',
        firstName: 'Amanda',
        lastName: 'Nunes',
        age: 37
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(readStoredDraft()).toEqual({
      sessionDate: '2026-03-28',
      sessionTime: '07:15',
      selectedMemberIds: []
    })

    await setSessionField(wrapper, 'date', '2026-03-29')
    await setSessionField(wrapper, 'time', '18:30')
    await memberRow(wrapper, 'Amanda Nunes').trigger('click')

    expect(readStoredDraft()).toEqual({
      sessionDate: '2026-03-29',
      sessionTime: '18:30',
      selectedMemberIds: ['member-2']
    })
  })

  it('shows friendly duplicate-session copy instead of the raw domain error', async () => {
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])
    mockRegisterAttendanceListHandle.mockRejectedValue(
      new AttendanceListAlreadyExistsError(new Date('2026-03-27T17:00:00Z'))
    )

    const wrapper = mountView()
    await flushPromises()

    await setSessionField(wrapper, 'date', '2026-03-27')
    await setSessionField(wrapper, 'time', '18:30')
    await saveButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain(
      'Lista obecności dla tego terminu już istnieje.'
    )
    expect(wrapper.text()).not.toContain('2026-03-27T17:00:00.000Z')
  })

  it('resets the draft after a successful save onto the quarter-hour grid, replaces the stored draft, and keeps the success banner on screen', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 28, 7, 8, 0))
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        age: 36
      }
    ])

    const wrapper = mountView()
    await flushPromises()

    await setSessionField(wrapper, 'date', '2026-03-27')
    await setSessionField(wrapper, 'time', '18:30')
    await memberRow(wrapper, 'Anderson Silva').trigger('click')
    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith('/attendance')
    expect(wrapper.text()).toContain('Zapisano obecność dla 1 osób.')
    expect(wrapper.find('.attendance-member-row--selected').exists()).toBe(
      false
    )
    await wrapper.find('#attendance-session-date-trigger').trigger('click')
    expect(
      (wrapper.find('#attendance-date').element as HTMLInputElement).value
    ).toBe('2026-03-28')
    await wrapper.find('#attendance-session-time-trigger').trigger('click')
    expect(
      (wrapper.find('#attendance-time').element as HTMLInputElement).value
    ).toBe('07:15')
    expect(readStoredDraft()).toEqual({
      sessionDate: '2026-03-28',
      sessionTime: '07:15',
      selectedMemberIds: []
    })
  })

  it('ignores malformed stored draft data and falls back to a fresh local draft', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 28, 7, 15, 0))
    window.localStorage.setItem(ATTENDANCE_DRAFT_STORAGE_KEY, '{bad json')
    mockListMembersForAttendanceEditorHandle.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('#attendance-session-date-trigger').text()).toContain(
      '28 marca 2026'
    )
    expect(wrapper.find('#attendance-session-time-trigger').text()).toContain(
      '07:15'
    )
    expect(readStoredDraft()).toEqual({
      sessionDate: '2026-03-28',
      sessionTime: '07:15',
      selectedMemberIds: []
    })
  })
})
