import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/db'
import { createAppI18n } from '@/ui/i18n'
import { useRouter } from '@/ui/router/runtime'
import MembersListView from '@/ui/views/MembersListView.vue'

vi.mock('@/infra/db', () => ({
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
})
