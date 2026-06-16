import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { useAppServices } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import { useRoute } from '@/ui/router/runtime'
import CampParticipantDetailsView from '@/ui/views/camps/CampParticipantDetailsView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn()
}))

describe('CampParticipantDetailsView', () => {
  let mockGetCampParticipantDetailsHandle: Mock
  let mockRegisterDiscountHandle: Mock
  let mockRegisterPaymentHandle: Mock
  let mockAcceptResignationHandle: Mock

  beforeEach(() => {
    mockGetCampParticipantDetailsHandle = vi
      .fn()
      .mockResolvedValue(createCampParticipantDetails())
    mockRegisterDiscountHandle = vi.fn().mockResolvedValue(undefined)
    mockRegisterPaymentHandle = vi.fn().mockResolvedValue(undefined)
    mockAcceptResignationHandle = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        getCampParticipantDetails: {
          handle: mockGetCampParticipantDetailsHandle
        }
      },
      useCases: {
        acceptCampParticipantResignation: {
          handle: mockAcceptResignationHandle
        },
        registerCampParticipantDiscount: {
          handle: mockRegisterDiscountHandle
        },
        registerCampParticipantPayment: {
          handle: mockRegisterPaymentHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRoute).mockReturnValue({
      params: {
        campId: 'camp-winter-2026',
        participantId: 'participant-1'
      }
    } as unknown as ReturnType<typeof useRoute>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(CampParticipantDetailsView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  function findButton(wrapper: VueWrapper, label: string) {
    const button = wrapper
      .findAll('button')
      .find((currentButton) => currentButton.text() === label)

    if (!button) {
      throw new Error(`Button not found: ${label}`)
    }

    return button
  }

  it('shows a coach the selected participant payment details from the read layer', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(mockGetCampParticipantDetailsHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026',
      participantId: 'participant-1'
    })
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Obóz zimowy')
    expect(wrapper.text()).toContain('12.12 - 19.12')
    expect(wrapper.text()).toContain('Status płatności')
    expect(wrapper.text()).toContain('Zapisany')
    expect(wrapper.text()).toContain('Przyznaj zniżkę')
    expect(wrapper.text()).toContain('Przyjmij płatność')
    expect(wrapper.text()).toContain('Przyjmij rezygnację')
  })

  it('lets a coach receive a camp payment for the participant', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    await wrapper.get('input#campParticipantPaymentAmount').setValue('125,50')
    await wrapper.get('input#campParticipantPaymentNote').setValue('gotówka')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockRegisterPaymentHandle).toHaveBeenCalledWith({
      amount: {
        amountMinor: 12550,
        currency: 'PLN'
      },
      campId: 'camp-winter-2026',
      note: 'gotówka',
      participantId: 'participant-1'
    })
    expect(mockGetCampParticipantDetailsHandle).toHaveBeenCalledTimes(2)
  })

  it('lets a coach grant a discount with a reason', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyznaj zniżkę').trigger('click')
    await wrapper.get('input#campParticipantDiscountAmount').setValue('50')
    await wrapper
      .get('input#campParticipantDiscountReason')
      .setValue('rodzeństwo')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockRegisterDiscountHandle).toHaveBeenCalledWith({
      amount: {
        amountMinor: 5000,
        currency: 'PLN'
      },
      campId: 'camp-winter-2026',
      participantId: 'participant-1',
      reason: 'rodzeństwo'
    })
  })

  it('lets a coach accept a resignation with refund details', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij rezygnację').trigger('click')
    await wrapper.get('input#campParticipantResignationDeposit').setValue('200')
    await wrapper
      .get('input#campParticipantResignationRefund')
      .setValue('300,25')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockAcceptResignationHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026',
      nonRefundableDepositValue: {
        amountMinor: 20000,
        currency: 'PLN'
      },
      participantId: 'participant-1',
      refundedValue: {
        amountMinor: 30025,
        currency: 'PLN'
      }
    })
  })

  it('keeps invalid payment input in the view instead of calling the use case', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    await wrapper.get('input#campParticipantPaymentAmount').setValue('0')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Podaj dodatnią kwotę wpłaty.')
    expect(mockRegisterPaymentHandle).not.toHaveBeenCalled()
  })

  it('shows a retry path when the participant details query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockGetCampParticipantDetailsHandle
      .mockRejectedValueOnce(new Error('IndexedDB blocked'))
      .mockResolvedValueOnce(createCampParticipantDetails())

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Nie udało się wczytać uczestnika.')

    await findButton(wrapper, 'Spróbuj ponownie').trigger('click')
    await flushPromises()

    expect(mockGetCampParticipantDetailsHandle).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Amanda Nunes')
  })
})

function createCampParticipantDetails() {
  return {
    camp: {
      finishDate: new Date('2026-12-19T00:00:00Z'),
      name: 'Obóz zimowy',
      startDate: new Date('2026-12-12T00:00:00Z')
    },
    participant: {
      amountDue: {
        amountMinor: 80000,
        currency: 'PLN'
      },
      displayName: 'Amanda Nunes',
      paidAmount: {
        amountMinor: 30000,
        currency: 'PLN'
      },
      paymentProgressPercent: 37,
      status: 'registered'
    }
  }
}
