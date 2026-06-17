import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { useAppServices } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import { useRoute, useRouter } from '@/ui/router/runtime'
import RegisterExternalCampParticipantView from '@/ui/views/camps/RegisterExternalCampParticipantView.vue'
import { CampParticipantAlreadyRegisteredError } from '@/write/camps/application/RegisterCampParticipantUseCase'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('RegisterExternalCampParticipantView', () => {
  let mockLoadContextHandle: Mock
  let mockRegisterCampParticipantHandle: Mock
  let mockRouterReplace: Mock

  beforeEach(() => {
    mockLoadContextHandle = vi.fn().mockResolvedValue(createContext())
    mockRegisterCampParticipantHandle = vi.fn().mockResolvedValue(undefined)
    mockRouterReplace = vi.fn()
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        getExternalCampParticipantRegistrationContext: {
          handle: mockLoadContextHandle
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
      replace: mockRouterReplace
    } as unknown as ReturnType<typeof useRouter>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(RegisterExternalCampParticipantView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('shows the camp context and outsider identity fields from the read layer', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockLoadContextHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026'
    })
    expect(wrapper.text()).toContain('Winter camp')
    expect(
      wrapper.get('label[for="externalCampParticipantFirstName"]').text()
    ).toContain('Imię')
    expect(
      wrapper.get('label[for="externalCampParticipantLastName"]').text()
    ).toContain('Nazwisko')
    expect(
      normalizedText(wrapper.get('#externalCampParticipantPrice').text())
    ).toContain('1200')
  })

  it('lets a coach reveal discount and initial payment amount fields while recalculating the amount yet to pay', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(
      wrapper.find('#externalCampParticipantDiscountAmount').exists()
    ).toBe(false)
    expect(wrapper.find('#externalCampParticipantPaymentAmount').exists()).toBe(
      false
    )
    expect(amountYetToPayText(wrapper)).toContain('1200,00')

    await wrapper.get('#externalCampParticipantDiscountEnabled').setValue(true)
    await wrapper.get('#externalCampParticipantPaymentEnabled').setValue(true)

    await wrapper
      .get('#externalCampParticipantDiscountAmount')
      .setValue('100,25')
    await wrapper.get('#externalCampParticipantPaymentAmount').setValue('200')

    expect(amountYetToPayText(wrapper)).toContain('899,75')

    await wrapper.get('#externalCampParticipantPaymentAmount').setValue('2000')

    expect(amountYetToPayText(wrapper)).toContain('0,00')
    expect(paymentOverpaymentWarningText(wrapper)).toContain('900,25')
  })

  it('saves an outside club participant through the application use case and returns to camp details', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#externalCampParticipantFirstName').setValue('  Joanna ')
    await wrapper
      .get('#externalCampParticipantLastName')
      .setValue(' Jędrzejczyk ')
    await wrapper.get('#externalCampParticipantDiscountEnabled').setValue(true)
    await wrapper
      .get('#externalCampParticipantDiscountAmount')
      .setValue('100,25')
    await wrapper.get('#externalCampParticipantPaymentEnabled').setValue(true)
    await wrapper.get('#externalCampParticipantPaymentAmount').setValue('200')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockRegisterCampParticipantHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026',
      person: {
        type: 'external',
        firstName: 'Joanna',
        lastName: 'Jędrzejczyk'
      },
      totalAmountDue: {
        amountMinor: 120_000,
        currency: 'PLN'
      },
      initialDiscount: {
        amount: {
          amountMinor: 10_025,
          currency: 'PLN'
        }
      },
      initialPayment: {
        amount: {
          amountMinor: 20_000,
          currency: 'PLN'
        }
      }
    })
    expect(mockRouterReplace).toHaveBeenCalledWith('/camps/camp-winter-2026')
  })

  it('keeps an overpaid initial outside participant payment inside the registration form', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#externalCampParticipantFirstName').setValue('Joanna')
    await wrapper
      .get('#externalCampParticipantLastName')
      .setValue('Jędrzejczyk')
    await wrapper.get('#externalCampParticipantDiscountEnabled').setValue(true)
    await wrapper
      .get('#externalCampParticipantDiscountAmount')
      .setValue('100,25')
    await wrapper.get('#externalCampParticipantPaymentEnabled').setValue(true)
    await wrapper.get('#externalCampParticipantPaymentAmount').setValue('2000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Zniżka i wpłata nie mogą przekroczyć ceny obozu.'
    )
    expect(mockRegisterCampParticipantHandle).not.toHaveBeenCalled()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  it('returns to the participant picker when a coach cancels registration', async () => {
    const wrapper = mountView()
    await flushPromises()

    await buttonByText(wrapper, 'Wróć do wyboru').trigger('click')

    expect(mockRegisterCampParticipantHandle).not.toHaveBeenCalled()
    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/camps/camp-winter-2026/participants/new'
    )
  })

  it('shows an already signed error when the application use case rejects a duplicate outside participant', async () => {
    mockRegisterCampParticipantHandle.mockRejectedValue(
      new CampParticipantAlreadyRegisteredError('camp-winter-2026')
    )
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#externalCampParticipantFirstName').setValue('Joanna')
    await wrapper
      .get('#externalCampParticipantLastName')
      .setValue('Jędrzejczyk')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Ten uczestnik jest już zapisany')
    expect(mockRegisterCampParticipantHandle).toHaveBeenCalledOnce()
  })
})

function buttonByText(
  wrapper: ReturnType<typeof mount<typeof RegisterExternalCampParticipantView>>,
  text: string
) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes(text))

  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }

  return button
}

function amountYetToPayText(
  wrapper: ReturnType<typeof mount<typeof RegisterExternalCampParticipantView>>
) {
  return normalizedText(
    wrapper.get('#externalCampParticipantAmountYetToPay').text()
  )
}

function paymentOverpaymentWarningText(
  wrapper: ReturnType<typeof mount<typeof RegisterExternalCampParticipantView>>
) {
  return normalizedText(
    wrapper.get('#externalCampParticipantPaymentOverpaymentWarning').text()
  )
}

function normalizedText(text: string) {
  return text.replace(/\s/g, '')
}

function createContext() {
  return {
    camp: {
      id: 'camp-winter-2026',
      name: 'Winter camp',
      price: {
        amountMinor: 120_000,
        currency: 'PLN'
      }
    }
  }
}
