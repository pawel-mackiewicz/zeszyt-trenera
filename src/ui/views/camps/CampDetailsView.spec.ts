import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import { useAppServices } from '@/ui/appServices'
import { useRoute } from '@/ui/router/runtime'
import CampDetailsView from '@/ui/views/camps/CampDetailsView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn()
}))

describe('CampDetailsView', () => {
  let mockGetCampDetailsHandle: Mock

  beforeEach(() => {
    mockGetCampDetailsHandle = vi.fn().mockResolvedValue(createCampDetails())
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        getCampDetails: {
          handle: mockGetCampDetailsHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRoute).mockReturnValue({
      params: {
        campId: 'camp-winter-2026'
      }
    } as unknown as ReturnType<typeof useRoute>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(CampDetailsView, {
      global: {
        components: {
          RouterLink: defineComponent({
            props: {
              to: {
                type: String,
                required: true
              }
            },
            template: '<a :href="to"><slot /></a>'
          })
        },
        plugins: [createAppI18n(locale)],
        stubs: {}
      }
    })
  }

  it('shows the selected camp and its grouped participant ledger from the read layer', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockGetCampDetailsHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026'
    })
    expect(wrapper.text()).toContain('Obóz zimowy')
    expect(wrapper.text()).toContain('12.12.2026 - 19.12.2026')
    expect(wrapper.text()).toContain('Zapisani')
    expect(wrapper.text()).toContain('Opłacone')
    expect(wrapper.text()).toContain('Zrezygnowali')
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).toContain('jane doe')
    expect(wrapper.text()).toContain('Do zwrotu')
  })

  it('lets a coach narrow the camp ledger with the shared search control', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('input#camp-details-search').setValue('royce')

    expect(wrapper.text()).not.toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).not.toContain('jane doe')
  })

  it('shows a retry path when the camp details query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockGetCampDetailsHandle
      .mockRejectedValueOnce(new Error('IndexedDB blocked'))
      .mockResolvedValueOnce(createCampDetails())

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Nie udało się wczytać szczegółów obozu.')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Spróbuj ponownie')!
      .trigger('click')
    await flushPromises()

    expect(mockGetCampDetailsHandle).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Obóz zimowy')
  })

  it('links coaches to the camp participant member list', async () => {
    const wrapper = mountView()
    await flushPromises()

    const addLink = wrapper
      .findAll('a')
      .find((link) => link.text() === 'Dodaj uczestnika')

    expect(addLink?.attributes('href')).toBe(
      '/camps/camp-winter-2026/participants/new'
    )
  })
})

function createCampDetails() {
  return {
    camp: {
      id: 'camp-winter-2026',
      name: 'Obóz zimowy',
      startDate: new Date('2026-12-12T00:00:00Z'),
      finishDate: new Date('2026-12-19T00:00:00Z')
    },
    participants: {
      registered: [
        {
          id: 'participant-1',
          addedAt: new Date('2026-05-01T00:00:00Z'),
          firstName: 'Amanda',
          lastName: 'Nunes',
          displayName: 'Amanda Nunes',
          age: 35,
          amountDue: {
            amountMinor: 80000,
            currency: 'PLN'
          },
          paidAmount: {
            amountMinor: 30000,
            currency: 'PLN'
          },
          paymentProgressPercent: 37,
          hasDiscount: true
        }
      ],
      fullyPaid: [
        {
          id: 'participant-2',
          addedAt: new Date('2026-05-02T00:00:00Z'),
          firstName: 'Royce',
          lastName: 'Gracie',
          displayName: 'Royce Gracie',
          age: null,
          amountDue: {
            amountMinor: 100000,
            currency: 'PLN'
          },
          paidAmount: {
            amountMinor: 100000,
            currency: 'PLN'
          },
          paymentProgressPercent: 100,
          hasDiscount: false
        }
      ],
      resigned: [
        {
          id: 'participant-3',
          addedAt: new Date('2026-05-03T00:00:00Z'),
          firstName: 'jane',
          lastName: 'doe',
          displayName: 'jane doe',
          age: null,
          amountToRefund: {
            amountMinor: 50000,
            currency: 'PLN'
          }
        }
      ]
    }
  }
}
