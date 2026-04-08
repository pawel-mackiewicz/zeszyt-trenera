import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { InvalidPhoneNumberError } from '@/domain/model/vo/PhoneNumber'
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
    const mockObserveMembershipPaymentStatusByMonthHandle = vi.fn()
    vi.mocked(useAppServices).mockReturnValue({
      useCases: {
        registerMember: { handle: mockRegisterMemberHandle } as unknown
      } as unknown,
      queries: {
        observeMembershipPaymentStatusByMonth: {
          handle: mockObserveMembershipPaymentStatusByMonthHandle
        }
      } as unknown
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
    await wrapper.find('input[id="phoneCountryCode"]').setValue('+48')
    await wrapper.find('input[id="phoneNumberRest"]').setValue('111 222 333')
    await wrapper.find('input[id="dateOfBirth"]').setValue('1990-01-01')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterMemberHandle).toHaveBeenCalledWith({
      firstName: 'Bao',
      lastName: 'Ninh',
      phoneNumber: '+48 111 222 333',
      dateOfBirth: new Date('1990-01-01T00:00:00Z')
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/member')
  })

  it('prefills the country code field with the +48 prefix', () => {
    const wrapper = mountView()

    expect(
      (wrapper.find('input[id="phoneCountryCode"]').element as HTMLInputElement)
        .value
    ).toBe('+48')
    expect(
      (wrapper.find('input[id="phoneNumberRest"]').element as HTMLInputElement)
        .value
    ).toBe('')
  })

  it('submits a null phone number when the local part is blank', async () => {
    const wrapper = mountView()

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterMemberHandle).toHaveBeenCalledWith({
      firstName: 'Bao',
      lastName: 'Ninh',
      phoneNumber: null
    })
  })

  it('marks only the name inputs as required in the registration form', () => {
    const wrapper = mountView('en')
    const labelTexts = wrapper
      .findAll('label')
      .map((label) => label.text().replace(/\s+/g, ' ').trim())
    const requiredMarkers = wrapper.findAll('label span[aria-hidden="true"]')

    expect(
      labelTexts.filter((labelText) => labelText.includes('*'))
    ).toStrictEqual(['First name *', 'Last name *'])
    expect(requiredMarkers).toHaveLength(2)
    expect(requiredMarkers[0]?.classes()).toEqual(
      expect.arrayContaining([
        'ml-1',
        'inline-block',
        'text-sm',
        'leading-none',
        'font-black',
        'text-danger'
      ])
    )

    expect(wrapper.get('input[id="firstName"]').attributes('required')).toBe('')
    expect(wrapper.get('input[id="lastName"]').attributes('required')).toBe('')
    expect(
      wrapper.get('input[id="phoneCountryCode"]').attributes('required')
    ).toBeUndefined()
    expect(
      wrapper.get('input[id="phoneNumberRest"]').attributes('required')
    ).toBeUndefined()
    expect(wrapper.get('input[id="dateOfBirth"]').attributes('required')).toBe(
      undefined
    )
    expect(wrapper.get('input[id="joinedAt"]').attributes('required')).toBe(
      undefined
    )
  })

  it('shows a friendly validation message when the phone number is invalid', async () => {
    mockRegisterMemberHandle.mockRejectedValue(
      new InvalidPhoneNumberError('bad-number')
    )

    const wrapper = mountView()

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('input[id="phoneCountryCode"]').setValue('+48')
    await wrapper.find('input[id="phoneNumberRest"]').setValue('bad-number')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain(
      'Sprawdź numer telefonu. Użyj numeru z kierunkowym kraju, na przykład +48 000 000 000.'
    )
    expect(wrapper.text()).not.toContain('bad-number')
  })

  it('keeps the required-field error copy inside the form dictionary', async () => {
    const wrapper = mountView()

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Podaj imię i nazwisko.')
    expect(mockRegisterMemberHandle).not.toHaveBeenCalled()
  })

  it('falls back to generic copy for unexpected failures', async () => {
    mockRegisterMemberHandle.mockRejectedValue(new Error('low-level failure'))

    const wrapper = mountView()

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('input[id="phoneCountryCode"]').setValue('+48')
    await wrapper.find('input[id="phoneNumberRest"]').setValue('111 222 333')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain(
      'Nie udało się zapisać członka. Sprawdź dane i spróbuj ponownie.'
    )
    expect(wrapper.text()).not.toContain('low-level failure')
  })

  it('renders field copy from the local English dictionary', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('First name')
    expect(wrapper.text()).toContain('Phone number')
    expect(wrapper.text()).toContain('Country code')
    expect(wrapper.text()).toContain('Rest of number')
    expect(wrapper.text()).toContain('Save')
  })
})
