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

import { createAppI18n } from '@/ui/i18n'
import { useAppServices } from '@/ui/appServices'
import { useRoute, useRouter } from '@/ui/router/runtime'
import CampClubMembersListView from '@/ui/views/camps/CampClubMembersListView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('CampClubMembersListView', () => {
  let mockListCandidatesHandle: Mock
  let mockRegisterCampParticipantHandle: Mock
  let mockRouterPush: Mock

  beforeEach(() => {
    mockListCandidatesHandle = vi.fn().mockResolvedValue(createCandidates())
    mockRegisterCampParticipantHandle = vi.fn()
    mockRouterPush = vi.fn()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        getClubCampParticipantRegistrationContext: {
          handle: vi.fn()
        },
        listCampParticipantCandidates: {
          handle: mockListCandidatesHandle
        }
      },
      useCases: {
        registerCampParticipant: {
          handle: mockRegisterCampParticipantHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRoute).mockReturnValue({
      params: {
        campId: 'camp-winter-2026'
      }
    } as unknown as ReturnType<typeof useRoute>)
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush
    } as unknown as ReturnType<typeof useRouter>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(CampClubMembersListView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('loads camp participant candidates from the read layer', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockListCandidatesHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026'
    })
    expect(wrapper.text()).toContain('Dodaj uczestnika obozu')
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Royce Gracie')
  })

  it('keeps already signed members at the bottom of the filtered list', async () => {
    const wrapper = mountView()
    await flushPromises()

    const rows = wrapper.findAll('li')

    expect(rows.map((row) => row.text())).toEqual([
      expect.stringContaining('Amanda Nunes'),
      expect.stringContaining('Anderson Silva'),
      expect.stringContaining('Royce Gracie')
    ])
    expect(rows[2].text()).toContain('Już zapisany')
  })

  it('lets a coach filter the list with the shared member controls', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('input#camp-participant-search').setValue('anderson')

    expect(wrapper.text()).not.toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Anderson Silva')
    expect(wrapper.text()).not.toContain('Royce Gracie')
  })

  it('routes a coach to the club registration flow after tapping an unsigned member row', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('li')[0].trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/camps/camp-winter-2026/participants/new/club/member-amanda'
    )
  })

  it('does not route a coach from an already signed member row', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('li')[2].trigger('click')

    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('routes a coach from the enabled add button without directly registering the participant', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-label') === 'Dodaj')!
      .trigger('click')

    expect(mockRegisterCampParticipantHandle).not.toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/camps/camp-winter-2026/participants/new/club/member-amanda'
    )
  })
})

function createCandidates() {
  return [
    {
      id: 'member-signed',
      firstName: 'Royce',
      lastName: 'Gracie',
      dateOfBirth: new Date('1966-12-12T00:00:00Z'),
      joinedAt: new Date('2026-02-01T00:00:00Z'),
      alreadySigned: true
    },
    {
      id: 'member-amanda',
      firstName: 'Amanda',
      lastName: 'Nunes',
      dateOfBirth: new Date('1991-05-30T00:00:00Z'),
      joinedAt: new Date('2026-01-01T00:00:00Z'),
      alreadySigned: false
    },
    {
      id: 'member-anderson',
      firstName: 'Anderson',
      lastName: 'Silva',
      dateOfBirth: new Date('1975-04-14T00:00:00Z'),
      joinedAt: new Date('2026-03-01T00:00:00Z'),
      alreadySigned: false
    }
  ]
}
