import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppI18n } from '@/ui/i18n.ts'
import { createAppServicesProvides } from '@/ui/appServices.ts'
import MembersListView from '@/ui/features/roster/MembersListView.vue'

describe('MembersListView', () => {
  const mockUpdateMemberHandle = vi.fn()
  const mockListMembersForRosterHandle = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
    mockUpdateMemberHandle.mockReset()
    mockListMembersForRosterHandle.mockReset()
    mockListMembersForRosterHandle.mockResolvedValue([])
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
            listMembersForRoster: {
              handle: mockListMembersForRosterHandle
            }
          } as never,
          useCases: {
            updateMember: { handle: mockUpdateMemberHandle }
          } as never
        })
      }
    })
  }

  it('renders loading copy from the local English dictionary', async () => {
    mockListMembersForRosterHandle.mockImplementation(
      () => new Promise(() => undefined) as never
    )

    const wrapper = mountView('en')
    await flushPromises()

    expect(wrapper.text()).toContain('Loading members...')
    expect(wrapper.find('#members-search').attributes('placeholder')).toBe(
      'Enter first and last name'
    )
  })

  it('renders the empty state from the local Polish dictionary', async () => {
    mockListMembersForRosterHandle.mockResolvedValue([])

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.text()).toContain('Brak zapisanych członków.')
    expect(wrapper.text()).toContain('0 członków')
  })

  it('renders the add-member action as the shared route link', async () => {
    mockListMembersForRosterHandle.mockResolvedValue([])

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.get('a[to="/member/new"]').attributes('to')).toBe(
      '/member/new'
    )
  })

  it('sorts members alphabetically by the visible full name', async () => {
    mockListMembersForRosterHandle.mockResolvedValue([
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

    const wrapper = mountView('en')
    await flushPromises()

    expect(
      wrapper
        .findAll('summary .font-headline')
        .map((summaryName) => summaryName.text())
    ).toStrictEqual(['Adam Alpha', 'Adam Zulu', 'Zane Beta'])
  })

  it('renders dedicated sort field choices and one direction toggle', async () => {
    mockListMembersForRosterHandle.mockResolvedValue([])

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
    mockListMembersForRosterHandle.mockResolvedValue([
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
    mockListMembersForRosterHandle.mockResolvedValue([
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
    mockListMembersForRosterHandle.mockResolvedValue([
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
    mockListMembersForRosterHandle.mockResolvedValue([
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
    mockUpdateMemberHandle.mockResolvedValue(undefined)

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
    mockListMembersForRosterHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-20T10:00:00Z')
      }
    ])

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
    mockListMembersForRosterHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        phoneNumber: '+48 111 111 111',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-20T10:00:00Z')
      }
    ])

    const wrapper = mountView('pl')
    await flushPromises()

    await wrapper.find('summary').trigger('click')

    const callAction = wrapper.get('a[href="tel:+48111111111"]')
    const msgAction = wrapper.get('a[href="sms:+48111111111"]')

    expect(callAction.text()).toBe('zadzwoń')
    expect(msgAction.text()).toBe('sms')
  })

  it('renders missing phone with the same typography as missing joined date details', async () => {
    mockListMembersForRosterHandle.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        dateOfBirth: new Date('1990-01-01T00:00:00Z'),
        createdAt: new Date('2026-03-20T10:00:00Z')
      }
    ])

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
