import { mount } from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock
} from 'vitest'
import { nextTick } from 'vue'

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

  afterEach(() => {
    vi.useRealTimers()
  })

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

  async function showUnexpectedFailureAlert(locale: 'pl' | 'en' = 'en') {
    mockRegisterMemberHandle.mockRejectedValue(new Error('low-level failure'))

    const wrapper = mountView(locale)

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('input[id="dateOfBirth"]').setValue('1990-01-01')
    await wrapper.find('input[id="phoneCountryCode"]').setValue('+48')
    await wrapper.find('input[id="phoneNumberRest"]').setValue('111 222 333')
    await wrapper.find('form').trigger('submit.prevent')

    return wrapper
  }

  async function dispatchPointerEvent(
    element: HTMLElement,
    type: string,
    clientY: number,
    pointerId = 1
  ) {
    element.dispatchEvent(
      Object.assign(new Event(type, { bubbles: true }), {
        pointerId,
        clientY
      })
    )

    await nextTick()
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

  it('renders age and exact date inputs together by default', () => {
    const wrapper = mountView('en')

    expect(wrapper.find('input[id="dateOfBirth"]').exists()).toBe(true)
    expect(wrapper.find('select[id="dateOfBirthAge"]').exists()).toBe(true)
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
    await wrapper.find('input[id="dateOfBirth"]').setValue('1990-01-01')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterMemberHandle).toHaveBeenCalledWith({
      firstName: 'Bao',
      lastName: 'Ninh',
      phoneNumber: null,
      dateOfBirth: new Date('1990-01-01T00:00:00Z')
    })
  })

  it('submits January 1 for the selected age', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    const wrapper = mountView('en')

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('select[id="dateOfBirthAge"]').setValue('12')
    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterMemberHandle).toHaveBeenCalledWith({
      firstName: 'Bao',
      lastName: 'Ninh',
      phoneNumber: null,
      dateOfBirth: new Date('2014-01-01T00:00:00Z')
    })
  })

  it('writes the resolved January date into the exact date field when age is selected', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    const wrapper = mountView('en')

    await wrapper.find('select[id="dateOfBirthAge"]').setValue('12')

    expect(
      (wrapper.get('input[id="dateOfBirth"]').element as HTMLInputElement).value
    ).toBe('2014-01-01')
  })

  it('derives the age picker value from a manually entered birth date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    const wrapper = mountView('en')

    await wrapper.find('input[id="dateOfBirth"]').setValue('2010-09-10')

    expect(
      (wrapper.get('select[id="dateOfBirthAge"]').element as HTMLSelectElement)
        .value
    ).toBe('15')
  })

  it('clears the canonical birth date when the age picker is reset', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    const wrapper = mountView('en')

    await wrapper.find('select[id="dateOfBirthAge"]').setValue('12')
    await wrapper.find('select[id="dateOfBirthAge"]').setValue('')

    expect(
      (wrapper.get('input[id="dateOfBirth"]').element as HTMLInputElement).value
    ).toBe('')
  })

  it('marks the add-member mandatory fields as required in the registration form', () => {
    const wrapper = mountView('en')
    const labelTexts = wrapper
      .findAll('label')
      .map((label) => label.text().replace(/\s+/g, ' ').trim())
    const requiredMarkers = wrapper.findAll('label span[aria-hidden="true"]')

    expect(
      labelTexts.filter((labelText) => labelText.includes('*'))
    ).toStrictEqual(['First name *', 'Last name *', 'Date of birth *'])
    expect(requiredMarkers).toHaveLength(3)
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
      ''
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
    await wrapper.find('input[id="dateOfBirth"]').setValue('1990-01-01')
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

    expect(wrapper.text()).toContain('Podaj imię, nazwisko i datę urodzenia.')
    expect(mockRegisterMemberHandle).not.toHaveBeenCalled()
  })

  it('blocks submit when the birth date is missing even if the names are filled', async () => {
    const wrapper = mountView('en')

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain(
      'Enter the first name, last name, and date of birth.'
    )
    expect(mockRegisterMemberHandle).not.toHaveBeenCalled()
  })

  it('falls back to generic copy for unexpected failures', async () => {
    mockRegisterMemberHandle.mockRejectedValue(new Error('low-level failure'))

    const wrapper = mountView()

    await wrapper.find('input[id="firstName"]').setValue('Bao')
    await wrapper.find('input[id="lastName"]').setValue('Ninh')
    await wrapper.find('input[id="dateOfBirth"]').setValue('1990-01-01')
    await wrapper.find('input[id="phoneCountryCode"]').setValue('+48')
    await wrapper.find('input[id="phoneNumberRest"]').setValue('111 222 333')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain(
      'Nie udało się zapisać członka. Sprawdź dane i spróbuj ponownie.'
    )
    expect(wrapper.text()).not.toContain('low-level failure')
  })

  it('shows a floating alert on submit failure and lets the user dismiss it', async () => {
    const wrapper = await showUnexpectedFailureAlert('en')

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain(
      'The member could not be saved. Check the details and try again.'
    )
    expect(alert.find('button[type="button"]').text()).toContain('Dismiss')

    await alert.find('button[type="button"]').trigger('click')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('dismisses the floating alert when the user swipes it upward past the threshold', async () => {
    const wrapper = await showUnexpectedFailureAlert('en')
    const alertElement = wrapper.find('[role="alert"]').element as HTMLElement

    await dispatchPointerEvent(alertElement, 'pointerdown', 180)
    await dispatchPointerEvent(alertElement, 'pointermove', 48)
    await dispatchPointerEvent(alertElement, 'pointerup', 48)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('keeps the floating alert visible when the upward swipe is too short', async () => {
    const wrapper = await showUnexpectedFailureAlert('en')
    const alertElement = wrapper.find('[role="alert"]').element as HTMLElement

    await dispatchPointerEvent(alertElement, 'pointerdown', 180)
    await dispatchPointerEvent(alertElement, 'pointermove', 132)
    await dispatchPointerEvent(alertElement, 'pointerup', 132)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('keeps the floating alert visible when the user drags it downward', async () => {
    const wrapper = await showUnexpectedFailureAlert('en')
    const alertElement = wrapper.find('[role="alert"]').element as HTMLElement

    await dispatchPointerEvent(alertElement, 'pointerdown', 180)
    await dispatchPointerEvent(alertElement, 'pointermove', 240)
    await dispatchPointerEvent(alertElement, 'pointerup', 240)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('renders field copy from the local English dictionary', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('First name')
    expect(wrapper.text()).toContain('Phone number')
    expect(wrapper.text()).toContain('Country code')
    expect(wrapper.text()).toContain('Rest of number')
    expect(wrapper.text()).toContain('Date of birth')
    expect(wrapper.text()).toContain('Exact date')
    expect(wrapper.text()).toContain('Age')
    expect(wrapper.text()).toContain('Save')
  })
})
