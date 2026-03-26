import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import AddMemberView from '@/ui/views/AddMemberView.vue'
import { useRouter } from '@/ui/router/runtime'
import { useAppServices } from '@/ui/appServices'

vi.mock('@/ui/router/runtime', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn()
}))

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('AddMemberView', () => {
  let mockRouterReplace: Mock
  let mockRegisterMemberHandle: Mock

  beforeEach(() => {
    mockRouterReplace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: mockRouterReplace,
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)

    mockRegisterMemberHandle = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppServices).mockReturnValue({
      useCases: {
        registerMember: { handle: mockRegisterMemberHandle } as unknown
      } as unknown,
      queries: {} as unknown
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(AddMemberView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('submits a new member successfully and navigates back', async () => {
    const wrapper = mountView()

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('input[id="phoneNumber"]').setValue('+48 111 222 333')
    await wrapper.find('input[id="dateOfBirth"]').setValue('1990-01-01')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterMemberHandle).toHaveBeenCalledWith({
      firstName: 'Bao',
      lastName: 'Ninh',
      phoneNumber: '+48 111 222 333',
      dateOfBirth: new Date('1990-01-01T00:00:00Z')
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/')
  })

  it('displays an error if submission fails', async () => {
    mockRegisterMemberHandle.mockRejectedValue(
      new Error('Format numeru jest zly')
    )

    const wrapper = mountView()

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('input[id="phoneNumber"]').setValue('bad-number')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Format numeru jest zly')
  })

  it('renders field copy from the local English dictionary', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('First name')
    expect(wrapper.text()).toContain('Phone number')
    expect(wrapper.text()).toContain('Save')
  })
})
