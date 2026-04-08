import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/db'
import { InvalidPhoneNumberError } from '@/domain/model/vo/PhoneNumber'
import { createAppI18n } from '@/ui/i18n'
import { createAppServicesProvides } from '@/ui/appServices'
import MembersListView from '@/ui/views/MembersListView.vue'

vi.mock('@/db', () => ({
  db: {
    open: vi.fn(),
    members: {
      toArray: vi.fn()
    }
  }
}))

describe('MembersListView', () => {
  const mockUpdateMemberHandle = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
    vi.mocked(db.open).mockResolvedValue({} as never)
    mockUpdateMemberHandle.mockReset()
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
          queries: {} as never,
          useCases: {
            updateMember: { handle: mockUpdateMemberHandle }
          } as never
        })
      }
    })
  }

  it('renders loading copy from the local English dictionary', async () => {
    vi.mocked(db.members.toArray).mockImplementation(
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
    vi.mocked(db.members.toArray).mockResolvedValue([])

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.text()).toContain('Brak zapisanych członków.')
    expect(wrapper.text()).toContain('0 członków')
  })

  it('renders the add-member action as the shared route link', async () => {
    vi.mocked(db.members.toArray).mockResolvedValue([])

    const wrapper = mountView('pl')
    await flushPromises()

    expect(wrapper.get('a[to="/member/new"]').attributes('to')).toBe(
      '/member/new'
    )
  })

  it('keeps unknown ages at the default range and normalizes crossed handles', async () => {
    vi.mocked(db.members.toArray).mockResolvedValue([
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
    vi.mocked(db.members.toArray).mockResolvedValue([
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

  it('shows roster edit errors in the floating alert and lets the user dismiss them', async () => {
    vi.mocked(db.members.toArray).mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Anderson',
        lastName: 'Silva',
        phoneNumber: '+48 111 111 111',
        createdAt: new Date('2026-03-20T10:00:00Z')
      }
    ])
    mockUpdateMemberHandle.mockRejectedValue(
      new InvalidPhoneNumberError('bad-number')
    )

    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.find('summary').trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit')
      ?.trigger('click')
    await wrapper.find('input[type="tel"]').setValue('bad-number')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Enter a valid phone number.'
    )

    const dismissButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Dismiss')
    expect(dismissButton).toBeDefined()
    await dismissButton?.trigger('click')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
