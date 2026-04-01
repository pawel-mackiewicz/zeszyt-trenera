import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/db'
import { createAppI18n } from '@/ui/i18n'
import { useRouter } from '@/ui/router/runtime'
import MembersListView from '@/ui/views/MembersListView.vue'

vi.mock('@/db', () => ({
  db: {
    open: vi.fn(),
    members: {
      toArray: vi.fn()
    }
  }
}))

vi.mock('@/ui/router/runtime', () => ({
  useRouter: vi.fn()
}))

describe('MembersListView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(db.open).mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountView(locale: 'pl' | 'en') {
    return mount(MembersListView, {
      global: {
        plugins: [createAppI18n(locale)]
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
    expect(wrapper.find('input').attributes('placeholder')).toBe(
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
})
