import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import { useAppServices } from '@/ui/appServices'
import CampsListView from '@/ui/views/camps/CampsListView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('CampsListView', () => {
  let mockListCampsHandle: Mock

  beforeEach(() => {
    mockListCampsHandle = vi.fn().mockResolvedValue({
      present: [],
      past: []
    })
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        listCamps: {
          handle: mockListCampsHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(CampsListView, {
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

  it('loads camps through the app read layer and renders present and past sections', async () => {
    mockListCampsHandle.mockResolvedValue({
      present: [
        {
          id: 'camp-winter-2026',
          name: 'Obóz zimowy',
          startDate: new Date(2026, 1, 1),
          finishDate: new Date(2026, 1, 11)
        },
        {
          id: 'camp-summer-2026',
          name: 'Obóz letni',
          startDate: new Date(2026, 5, 16),
          finishDate: new Date(2026, 5, 25)
        }
      ],
      past: [
        {
          id: 'camp-summer-2025',
          name: 'Obóz letni 2025',
          startDate: new Date(2025, 5, 16),
          finishDate: new Date(2025, 5, 25)
        }
      ]
    })

    const wrapper = mountView()
    await flushPromises()

    expect(mockListCampsHandle).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Aktualne obozy')
    expect(wrapper.text()).toContain('Zakończone obozy')
    expect(wrapper.text()).toContain('Obóz zimowy')
    expect(wrapper.text()).toContain('Obóz letni')
    expect(wrapper.text()).toContain('01.02.2026 - 11.02.2026')
    expect(wrapper.text()).toContain('16.06.2026 - 25.06.2026')
    expect(wrapper.text()).toContain('16.06.2025 - 25.06.2025')
    expect(
      wrapper.get('a[to="/camps/camp-winter-2026"]').attributes('to')
    ).toBe('/camps/camp-winter-2026')
  })

  it('keeps the query order instead of sorting camps again in the UI', async () => {
    mockListCampsHandle.mockResolvedValue({
      present: [
        {
          id: 'second',
          name: 'Drugi obóz',
          startDate: new Date(2026, 4, 1),
          finishDate: new Date(2026, 4, 10)
        },
        {
          id: 'first',
          name: 'Pierwszy obóz',
          startDate: new Date(2026, 3, 1),
          finishDate: new Date(2026, 3, 10)
        }
      ],
      past: []
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text().indexOf('Drugi obóz')).toBeLessThan(
      wrapper.text().indexOf('Pierwszy obóz')
    )
  })

  it('renders empty states for both camp groups', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Brak aktualnych obozów')
    expect(wrapper.text()).toContain('Brak zakończonych obozów')
  })

  it('routes the floating add action to the new camp placeholder', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('a[to="/camps/new"]').attributes('to')).toBe(
      '/camps/new'
    )
    expect(wrapper.get('a[to="/camps/new"]').attributes('aria-label')).toBe(
      'Dodaj obóz'
    )
    expect(wrapper.get('a[to="/camps/new"]').text()).toBe('Dodaj obóz')
  })

  it('shows a recoverable error state with retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockListCampsHandle
      .mockRejectedValueOnce(new Error('IndexedDB blocked'))
      .mockResolvedValueOnce({
        present: [
          {
            id: 'camp-winter-2026',
            name: 'Obóz zimowy',
            startDate: new Date(2026, 1, 1),
            finishDate: new Date(2026, 1, 11)
          }
        ],
        past: []
      })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Nie udało się wczytać obozów.')

    const retryButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Spróbuj ponownie')

    expect(retryButton).toBeDefined()
    await retryButton!.trigger('click')
    await flushPromises()

    expect(mockListCampsHandle).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Obóz zimowy')
  })
})
