import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { ClubAlreadyExistsError } from '@/write/domain/model/Club'
import { useAppServices } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import ClubSetupView from '@/ui/views/setup/ClubSetupView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('ClubSetupView', () => {
  let mockRegisterClubHandle: Mock

  beforeEach(() => {
    mockRegisterClubHandle = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useAppServices).mockReturnValue({
      useCases: {
        registerClub: {
          handle: mockRegisterClubHandle
        }
      } as unknown,
      queries: {} as unknown
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(ClubSetupView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('submits the club identity through the application layer', async () => {
    const wrapper = mountView()

    await wrapper
      .find('input[id="clubName"]')
      .setValue('ZKS Włókniarz Częstochowa')
    await wrapper.find('input[id="foundingDate"]').setValue('1946-01-01')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterClubHandle).toHaveBeenCalledWith({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })
  })

  it('keeps the required-field guidance inside the local setup dictionary', async () => {
    const wrapper = mountView()

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Podaj nazwę klubu i datę założenia.')
    expect(mockRegisterClubHandle).not.toHaveBeenCalled()
  })

  it('shows a friendly message when the club is already registered locally', async () => {
    mockRegisterClubHandle.mockRejectedValue(new ClubAlreadyExistsError())

    const wrapper = mountView()

    await wrapper
      .find('input[id="clubName"]')
      .setValue('ZKS Włókniarz Częstochowa')
    await wrapper.find('input[id="foundingDate"]').setValue('1946-01-01')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain(
      'Klub jest już zapisany na tym urządzeniu.'
    )
  })

  it('shows the setup error in the floating alert and lets the user dismiss it', async () => {
    mockRegisterClubHandle.mockRejectedValue(new ClubAlreadyExistsError())

    const wrapper = mountView('en')

    await wrapper
      .find('input[id="clubName"]')
      .setValue('Riverside Wrestling Club')
    await wrapper.find('input[id="foundingDate"]').setValue('1946-01-01')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'The club is already saved on this device.'
    )

    await wrapper.find('button[type="button"]').trigger('click')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('renders the local English onboarding copy', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('Add the club')
    expect(wrapper.text()).toContain('Save club')
  })
})
