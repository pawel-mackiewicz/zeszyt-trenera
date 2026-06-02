import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppI18n } from '@/ui/i18n.ts'
import { createAppServicesProvides } from '@/ui/appServices.ts'
import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import MembersListView from '@/ui/features/roster/MembersListView.vue'

describe('MembersListView', () => {
  const mockArchiveMemberHandle = vi.fn()
  const mockUnarchiveMemberHandle = vi.fn()
  const mockUpdateMemberHandle = vi.fn()
  const mockObserveArchivedMembersForRosterHandle = vi.fn()
  const mockObserveMembersForRosterHandle = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
    mockArchiveMemberHandle.mockReset()
    mockUnarchiveMemberHandle.mockReset()
    mockUpdateMemberHandle.mockReset()
    mockObserveArchivedMembersForRosterHandle.mockReset()
    mockObserveMembersForRosterHandle.mockReset()
    mockObserveArchivedMembersForRosterHandle.mockReturnValue(
      createObservable([])
    )
    mockObserveMembersForRosterHandle.mockReturnValue(createObservable([]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountView(locale: 'pl' | 'en') {
    return mount(MembersListView, {
      global: {
        plugins: [createAppI18n(locale)],
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to" :to="to" v-bind="$attrs"><slot /></a>'
          }
        },
        provide: createAppServicesProvides({
          queries: {
            observeArchivedMembersForRoster: {
              handle: mockObserveArchivedMembersForRosterHandle
            },
            observeMembersForRoster: {
              handle: mockObserveMembersForRosterHandle
            }
          } as never,
          useCases: {
            archiveMember: { handle: mockArchiveMemberHandle },
            unarchiveMember: { handle: mockUnarchiveMemberHandle },
            updateMember: { handle: mockUpdateMemberHandle }
          } as never
        })
      }
    })
  }

  it('renders loading copy from the local English dictionary', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([], { emit: false })
    )

    const wrapper = mountView('en')
    await flushPromises()

    expect(wrapper.text()).toContain('Loading members...')
    expect(wrapper.find('#members-search').attributes('placeholder')).toBe(
      'Enter first and last name'
    )
  })

  it('renders the empty state from the local Polish dictionary', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(createObservable([]))

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.text()).toContain('Brak zapisanych członków.')
    expect(wrapper.text()).toContain('0 członków')
  })

  it('renders active and archived tabs between filters and the member ledger', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-active',
          firstName: 'Active',
          lastName: 'Member',
          dateOfBirth: new Date('1994-06-01T00:00:00Z')
        }
      ])
    )
    mockObserveArchivedMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-archived',
          firstName: 'Archived',
          lastName: 'Member',
          dateOfBirth: new Date('1988-06-01T00:00:00Z')
        }
      ])
    )

    const wrapper = mountView('en')
    await flushPromises()

    const tabs = wrapper.get('nav[aria-label="Roster scope"]')
    const tabButtons = tabs.findAll('button')
    expect(tabButtons.map((button) => button.text())).toStrictEqual([
      'Active',
      'Archived'
    ])
    expect(tabButtons[0]?.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Active Member')
    expect(wrapper.text()).not.toContain('Archived Member')

    await tabButtons[1]?.trigger('click')
    await flushRosterTabTransition()

    expect(mockObserveArchivedMembersForRosterHandle).toHaveBeenCalledOnce()
    expect(tabButtons[1]?.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Archived Member')
    expect(wrapper.text()).not.toContain('Active Member')
  })

  it('keeps the active roster subscription loaded while switching roster tabs', async () => {
    const activeMembersObservable = createObservable<MemberRosterListItem[]>([
      {
        id: 'member-active',
        firstName: 'Active',
        lastName: 'Member',
        dateOfBirth: new Date('1994-06-01T00:00:00Z')
      }
    ])
    mockObserveMembersForRosterHandle.mockReturnValue(activeMembersObservable)
    mockObserveArchivedMembersForRosterHandle.mockReturnValue(
      createObservable([])
    )

    const wrapper = mountView('en')
    await flushPromises()

    const tabButtons = wrapper
      .get('nav[aria-label="Roster scope"]')
      .findAll('button')
    expect(mockObserveMembersForRosterHandle).toHaveBeenCalledTimes(1)
    expect(mockObserveArchivedMembersForRosterHandle).toHaveBeenCalledTimes(1)

    await tabButtons[1]?.trigger('click')
    await flushRosterTabTransition()

    activeMembersObservable.emit([
      {
        id: 'member-active-updated',
        firstName: 'Still',
        lastName: 'Loaded',
        dateOfBirth: new Date('1994-06-01T00:00:00Z')
      }
    ])
    await flushPromises()

    expect(mockObserveMembersForRosterHandle).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Still Loaded')

    await tabButtons[0]?.trigger('click')
    await flushRosterTabTransition()

    expect(mockObserveMembersForRosterHandle).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Still Loaded')
    expect(wrapper.text()).not.toContain('Loading members...')
  })

  it('renders the add-member action as the shared route link', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(createObservable([]))

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.get('a[to="/member/new"]').attributes('to')).toBe(
      '/member/new'
    )
  })

  it('closes the open drawer after archiving the member', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          phoneNumber: '+48 111 111 111',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        }
      ])
    )
    mockArchiveMemberHandle.mockResolvedValue(undefined)

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.find('summary').trigger('click')
    await wrapper.get('[data-testid="member-archive-open"]').trigger('click')
    expect(wrapper.text()).toContain('Archive member?')
    expect(wrapper.get('[data-testid="member-archive-confirm"]').text()).toBe(
      'Archive'
    )

    await wrapper.get('[data-testid="member-archive-confirm"]').trigger('click')
    await flushPromises()

    expect(mockArchiveMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1'
    })
    expect(wrapper.get('details').attributes('open')).toBeUndefined()
  })

  it('shows only the unarchive button for archived members and closes the drawer after restoring', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(createObservable([]))
    mockObserveArchivedMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-archived',
          firstName: 'Archived',
          lastName: 'Member',
          phoneNumber: '+48 111 111 111',
          dateOfBirth: new Date('1988-06-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        }
      ])
    )
    mockUnarchiveMemberHandle.mockResolvedValue(undefined)

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper
      .get('nav[aria-label="Roster scope"]')
      .findAll('button')[1]
      .trigger('click')
    await flushRosterTabTransition()
    await wrapper.find('summary').trigger('click')

    expect(wrapper.find('[data-testid="member-archive-open"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="member-delete-open"]').exists()).toBe(
      false
    )
    expect(wrapper.get('[data-testid="member-unarchive"]').text()).toBe('')
    expect(
      wrapper.get('[data-testid="member-unarchive"]').attributes('aria-label')
    ).toBe('Unarchive member Archived Member')

    await wrapper.get('[data-testid="member-unarchive"]').trigger('click')
    await flushPromises()

    expect(mockUnarchiveMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-archived'
    })
    expect(wrapper.get('details').attributes('open')).toBeUndefined()
  })

  it('sorts members alphabetically by the visible full name', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Zane',
          lastName: 'Beta',
          dateOfBirth: new Date('1994-06-01T00:00:00Z'),
          createdAt: new Date('2026-03-22T10:00:00Z')
        },
        {
          id: 'member-2',
          firstName: 'Adam',
          lastName: 'Zulu',
          dateOfBirth: new Date('1986-03-01T00:00:00Z'),
          createdAt: new Date('2026-03-23T10:00:00Z')
        },
        {
          id: 'member-3',
          firstName: 'Adam',
          lastName: 'Alpha',
          dateOfBirth: new Date('2003-08-01T00:00:00Z'),
          createdAt: new Date('2026-03-24T10:00:00Z')
        }
      ])
    )

    const wrapper = mountView('en')
    await flushPromises()

    expect(
      wrapper
        .findAll('summary .font-headline')
        .map((summaryName) => summaryName.text())
    ).toStrictEqual(['Adam Alpha', 'Adam Zulu', 'Zane Beta'])
  })

  it('renders dedicated sort field choices and one direction toggle', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(createObservable([]))

    const wrapper = mountView('en')
    await flushPromises()

    const sortOptions = wrapper
      .get('#members-sort-field')
      .findAll('option')
      .map((option) => ({
        text: option.text(),
        value: option.element.getAttribute('value')
      }))

    expect(sortOptions).toStrictEqual([
      { text: 'First name', value: 'firstName' },
      { text: 'Last name', value: 'lastName' },
      { text: 'Age', value: 'dateOfBirth' },
      { text: 'Join date', value: 'joinedAt' }
    ])
    const directionToggle = wrapper.get(
      'button[aria-label="Direction: Ascending"]'
    )

    expect(directionToggle.attributes('title')).toBe('Direction: Ascending')
  })

  it('changes roster ordering when the selected sort field or direction changes', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Zane',
          lastName: 'Beta',
          dateOfBirth: new Date('1994-06-01T00:00:00Z'),
          joinedAt: new Date('2024-02-01T00:00:00Z'),
          createdAt: new Date('2026-03-22T10:00:00Z')
        },
        {
          id: 'member-2',
          firstName: 'Adam',
          lastName: 'Zulu',
          dateOfBirth: new Date('1986-03-01T00:00:00Z'),
          joinedAt: new Date('2023-01-15T00:00:00Z'),
          createdAt: new Date('2026-03-23T10:00:00Z')
        },
        {
          id: 'member-3',
          firstName: 'Adam',
          lastName: 'Alpha',
          dateOfBirth: new Date('2003-08-01T00:00:00Z'),
          joinedAt: new Date('2025-04-01T00:00:00Z'),
          createdAt: new Date('2026-03-24T10:00:00Z')
        }
      ])
    )

    const wrapper = mountView('en')
    await flushPromises()

    const renderedNames = () =>
      wrapper
        .findAll('summary .font-headline')
        .map((summaryName) => summaryName.text())

    expect(renderedNames()).toStrictEqual([
      'Adam Alpha',
      'Adam Zulu',
      'Zane Beta'
    ])

    await wrapper.get('#members-sort-field').setValue('lastName')
    await flushPromises()

    expect(renderedNames()).toStrictEqual([
      'Adam Alpha',
      'Zane Beta',
      'Adam Zulu'
    ])

    await wrapper
      .get('button[aria-label="Direction: Ascending"]')
      .trigger('click')
    await flushPromises()

    expect(renderedNames()).toStrictEqual([
      'Adam Zulu',
      'Zane Beta',
      'Adam Alpha'
    ])

    await wrapper.get('#members-sort-field').setValue('joinedAt')
    await flushPromises()

    expect(renderedNames()).toStrictEqual([
      'Adam Alpha',
      'Zane Beta',
      'Adam Zulu'
    ])
  })

  it('applies normalized age-range filtering when slider handles cross', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          phoneNumber: '+48 111 111 111',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        },
        {
          id: 'member-2',
          firstName: 'Royce',
          lastName: 'Gracie',
          phoneNumber: '+48 222 222 222',
          dateOfBirth: new Date('1970-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-21T10:00:00Z')
        },
        {
          id: 'member-3',
          firstName: 'Mystery',
          lastName: 'Member',
          phoneNumber: '+48 333 333 333',
          dateOfBirth: new Date('2018-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-22T10:00:00Z')
        }
      ])
    )

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.text()).toContain('Mystery Member')

    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue('60')
    await sliders[1].setValue('30')
    await flushPromises()

    expect(wrapper.text()).toContain('Anderson Silva')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).not.toContain('Mystery Member')
  })

  it('submits member updates through the application layer use case', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          phoneNumber: '+48 111 111 111',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        }
      ])
    )
    mockUpdateMemberHandle.mockResolvedValue(undefined)

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.find('summary').trigger('click')
    const editButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit')
    expect(editButton).toBeDefined()
    await editButton?.trigger('click')

    const form = wrapper.find('form')
    await form.find('input[type="text"]').setValue('Amanda')
    await form.find('input[type="tel"]').setValue('+48 999 888 777')
    await form.trigger('submit.prevent')

    expect(mockUpdateMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1',
      firstName: 'Amanda',
      lastName: 'Silva',
      phoneNumber: '+48 999 888 777',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      joinedAt: new Date('2024-01-01T00:00:00.000Z')
    })
  })

  it('keeps edit labels plain while letting the edit form clear phone', async () => {
    const membersObservable = createObservable<MemberRosterListItem[]>([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        joinedAt: new Date('2024-01-01T00:00:00Z')
      }
    ])
    mockObserveMembersForRosterHandle.mockReturnValue(membersObservable)
    mockUpdateMemberHandle.mockImplementation(async () => {
      membersObservable.emit([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          joinedAt: new Date('2024-01-01T00:00:00Z')
        }
      ])
    })

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.find('summary').trigger('click')
    const editButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit')
    expect(editButton).toBeDefined()
    await editButton?.trigger('click')

    const form = wrapper.get('form')
    const labelTexts = form
      .findAll('label')
      .map((label) => label.text().replace(/\s+/g, ' ').trim())

    expect(labelTexts).toStrictEqual([
      'First name',
      'Last name',
      'Phone',
      'Birth date',
      'Joined'
    ])

    const textInputs = form.findAll('input[type="text"]')
    expect(textInputs[0]?.attributes('required')).toBe('')
    expect(textInputs[1]?.attributes('required')).toBe('')
    expect(form.get('input[type="tel"]').attributes('required')).toBeUndefined()
    expect(form.get('input[type="date"]').attributes('required')).toBe('')

    await form.get('input[type="tel"]').setValue('')
    await form.trigger('submit.prevent')
    await flushPromises()

    expect(mockUpdateMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1',
      firstName: 'Anderson',
      lastName: 'Silva',
      phoneNumber: '',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      joinedAt: new Date('2024-01-01T00:00:00.000Z')
    })
    expect(wrapper.text()).toContain('Missing')
  })

  it('renders call and msg actions for saved phone numbers', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          phoneNumber: '+48 111 111 111',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        }
      ])
    )

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.find('summary').trigger('click')

    const callAction = wrapper.get('a[href="tel:+48111111111"]')
    const msgAction = wrapper.get('a[href="sms:+48111111111"]')
    expect(wrapper.text()).toContain('+48 111 111 111')
    expect(callAction.text()).toBe('call')
    expect(msgAction.text()).toBe('msg')
  })

  it('localizes call and msg actions in Polish', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          phoneNumber: '+48 111 111 111',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        }
      ])
    )

    const wrapper = mountView('pl')
    await flushPromises()

    await wrapper.find('summary').trigger('click')

    const callAction = wrapper.get('a[href="tel:+48111111111"]')
    const msgAction = wrapper.get('a[href="sms:+48111111111"]')

    expect(callAction.text()).toBe('zadzwoń')
    expect(msgAction.text()).toBe('sms')
  })

  it('renders missing phone with the same typography as missing joined date details', async () => {
    mockObserveMembersForRosterHandle.mockReturnValue(
      createObservable([
        {
          id: 'member-1',
          firstName: 'Anderson',
          lastName: 'Silva',
          dateOfBirth: new Date('1990-01-01T00:00:00Z'),
          createdAt: new Date('2026-03-20T10:00:00Z')
        }
      ])
    )

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.find('summary').trigger('click')

    const missingValueSpans = wrapper
      .findAll('span')
      .filter((span) => span.text() === 'Missing')

    expect(missingValueSpans).toHaveLength(2)
    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="sms:"]').exists()).toBe(false)
    expect(missingValueSpans[0]?.classes().sort()).toStrictEqual(
      missingValueSpans[1]?.classes().sort()
    )
  })
})

type TestObservableObserver<T> = {
  next(value: T): void
  error(error: unknown): void
}

function createObservable<T>(value: T, options: { emit?: boolean } = {}) {
  const observers = new Set<TestObservableObserver<T>>()

  return {
    emit(value: T) {
      observers.forEach((observer) => observer.next(value))
    },
    subscribe(observer: TestObservableObserver<T>) {
      observers.add(observer)

      if (options.emit !== false) {
        observer.next(value)
      }

      return {
        unsubscribe() {
          observers.delete(observer)
        }
      }
    }
  }
}

async function flushRosterTabTransition() {
  await flushPromises()
  vi.runOnlyPendingTimers()
  await flushPromises()
  vi.runOnlyPendingTimers()
  await flushPromises()
}
