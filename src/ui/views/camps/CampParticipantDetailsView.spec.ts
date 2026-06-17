import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock
} from 'vitest'
import { reactive } from 'vue'

import type { CampParticipantActionsContext } from '@/read/ObserveCampParticipantActionsContextQuery'
import type { CampParticipantDetails } from '@/read/ObserveCampParticipantDetailsQuery'
import type {
  CampParticipantPayment,
  CampParticipantPaymentRefund
} from '@/read/ObserveCampParticipantPaymentQuery'
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

type TestObservableObserver<T> = {
  next(value: T): void
  error?(error: unknown): void
}

type TestObservable<T> = {
  emit(value: T): void
  fail(error: unknown): void
  subscribe(observer: TestObservableObserver<T>): {
    unsubscribe(): void
  }
}

describe('CampParticipantDetailsView', () => {
  let mockObserveCampParticipantActionsContextHandle: Mock
  let mockObserveCampParticipantDetailsHandle: Mock
  let mockObserveCampParticipantPaymentHandle: Mock
  let mockRegisterDiscountHandle: Mock
  let mockRegisterPaymentHandle: Mock
  let mockRegisterRefundHandle: Mock
  let mockAcceptResignationHandle: Mock
  let mockCancelResignationHandle: Mock
  let route: ReturnType<typeof createRoute>
  let subscriptionUnsubscribeSpies: Mock[]
  let detailsObservable: TestObservable<CampParticipantDetails | null>
  let paymentObservable: TestObservable<CampParticipantPayment | null>
  let actionsContextObservable: TestObservable<CampParticipantActionsContext | null>

  beforeEach(() => {
    route = createRoute()
    subscriptionUnsubscribeSpies = []
    detailsObservable = createObservable(
      createCampParticipantDetails(),
      subscriptionUnsubscribeSpies
    )
    paymentObservable = createObservable(
      createCampParticipantPayment(),
      subscriptionUnsubscribeSpies
    )
    actionsContextObservable = createObservable(
      createCampParticipantActionsContext(),
      subscriptionUnsubscribeSpies
    )
    mockObserveCampParticipantDetailsHandle = vi.fn(() => detailsObservable)
    mockObserveCampParticipantPaymentHandle = vi.fn(() => paymentObservable)
    mockObserveCampParticipantActionsContextHandle = vi.fn(
      () => actionsContextObservable
    )
    mockRegisterDiscountHandle = vi.fn().mockResolvedValue(undefined)
    mockRegisterPaymentHandle = vi.fn().mockResolvedValue(undefined)
    mockRegisterRefundHandle = vi.fn().mockResolvedValue(undefined)
    mockAcceptResignationHandle = vi.fn().mockResolvedValue(undefined)
    mockCancelResignationHandle = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        observeCampParticipantActionsContext: {
          handle: mockObserveCampParticipantActionsContextHandle
        },
        observeCampParticipantDetails: {
          handle: mockObserveCampParticipantDetailsHandle
        },
        observeCampParticipantPayment: {
          handle: mockObserveCampParticipantPaymentHandle
        }
      },
      useCases: {
        acceptCampParticipantResignation: {
          handle: mockAcceptResignationHandle
        },
        cancelCampParticipantResignation: {
          handle: mockCancelResignationHandle
        },
        registerCampParticipantDiscount: {
          handle: mockRegisterDiscountHandle
        },
        registerCampParticipantPayment: {
          handle: mockRegisterPaymentHandle
        },
        registerCampParticipantRefund: {
          handle: mockRegisterRefundHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRoute).mockReturnValue(
      route as unknown as ReturnType<typeof useRoute>
    )
  })

  afterEach(() => {
    vi.useRealTimers()
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
      .find((currentButton) => currentButton.text().trim() === label)

    if (!button) {
      throw new Error(`Button not found: ${label}`)
    }

    return button
  }

  it('passes the route IDs to all self-sufficient participant sections', async () => {
    const wrapper = mountView()
    await flushPromises()

    const routeIds = {
      campId: 'camp-winter-2026',
      participantId: 'participant-1'
    }

    expect(mockObserveCampParticipantDetailsHandle).toHaveBeenCalledWith(
      routeIds
    )
    expect(mockObserveCampParticipantPaymentHandle).toHaveBeenCalledWith(
      routeIds
    )
    expect(mockObserveCampParticipantActionsContextHandle).toHaveBeenCalledWith(
      routeIds
    )
    expect(wrapper.text()).toContain('Uczestnik obozu')
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Status płatności')
    expect(wrapper.text()).toContain('Przyjmij płatność')
    expect(wrapper.text()).toContain('Zarejestruj zwrot')
  })

  it('updates details and payment when their own observable reads emit', async () => {
    const wrapper = mountView()
    await flushPromises()

    detailsObservable.emit(
      createCampParticipantDetails({
        camp: {
          finishDate: new Date('2026-08-12T00:00:00Z'),
          name: 'Obóz letni',
          startDate: new Date('2026-08-05T00:00:00Z')
        },
        participant: {
          displayName: 'Valentina Shevchenko',
          status: 'fullyPaid'
        }
      })
    )
    paymentObservable.emit(
      createCampParticipantPayment({
        basePrice: {
          amountMinor: 105000,
          currency: 'PLN'
        },
        amountDue: {
          amountMinor: 90000,
          currency: 'PLN'
        },
        discountSum: {
          amountMinor: 15000,
          currency: 'PLN'
        },
        paidAmount: {
          amountMinor: 90000,
          currency: 'PLN'
        },
        paymentProgressPercent: 100,
        status: 'fullyPaid'
      })
    )
    await flushPromises()

    expect(wrapper.text()).toContain('Valentina Shevchenko')
    expect(wrapper.text()).toContain('Obóz letni')
    expect(wrapper.text()).toContain('Opłacony')
    expect(wrapper.text()).toContain('Cena bazowa')
    expect(wrapper.text()).toContain('1050,00')
    expect(wrapper.text()).toContain('Zniżki')
    expect(wrapper.text()).toContain('900,00')
    expect(wrapper.text()).toContain('Wpłaty')
    expect(wrapper.text()).toContain('Do zapłaty')
    expect(wrapper.text()).toContain('0,00')
    expect(mockObserveCampParticipantDetailsHandle).toHaveBeenCalledTimes(1)
    expect(mockObserveCampParticipantPaymentHandle).toHaveBeenCalledTimes(1)
  })

  it('shows the active payment story without discounts when the discount sum is zero', async () => {
    paymentObservable = createObservable(
      createCampParticipantPayment({
        amountDue: {
          amountMinor: 80000,
          currency: 'PLN'
        },
        discountSum: {
          amountMinor: 0,
          currency: 'PLN'
        },
        paidAmount: {
          amountMinor: 30000,
          currency: 'PLN'
        },
        paymentProgressPercent: 37,
        status: 'registered'
      }),
      subscriptionUnsubscribeSpies
    )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Cena bazowa')
    expect(wrapper.text()).toContain('Wpłaty')
    expect(wrapper.text()).toContain('Do zapłaty')
    expect(wrapper.text()).not.toContain('Zniżki')
  })

  it('shows when the participant resignation story has been refunded', async () => {
    detailsObservable = createObservable(
      createCampParticipantDetails({
        participant: {
          displayName: 'Amanda Nunes',
          status: 'refunded'
        }
      }),
      subscriptionUnsubscribeSpies
    )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Zwrócono')
    expect(wrapper.text()).not.toContain('Rezygnacja')
  })

  it('shows the refunded payment story without discounts', async () => {
    detailsObservable = createObservable(
      createCampParticipantDetails({
        participant: {
          displayName: 'Amanda Nunes',
          status: 'refunded'
        }
      }),
      subscriptionUnsubscribeSpies
    )
    paymentObservable = createObservable(
      createCampParticipantRefundPayment({
        amountToRefund: {
          amountMinor: 0,
          currency: 'PLN'
        },
        status: 'refunded'
      }),
      subscriptionUnsubscribeSpies
    )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Zwrócono')
    expect(wrapper.text()).toContain('Do zwrotu')
    expect(wrapper.text()).not.toContain('Zniżki')
  })

  it('opens a received payment with the remaining amount visible and the payment amount empty', async () => {
    actionsContextObservable = createObservable(
      createCampParticipantActionsContext({
        paymentPrefillAmount: {
          amountMinor: 44400,
          currency: 'PLN'
        }
      }),
      subscriptionUnsubscribeSpies
    )

    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')

    expect(wrapper.text()).toContain('Przyjmij płatność')
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Obóz zimowy')
    expect(wrapper.text()).toContain('444,00 PLN')
    expect(
      (
        wrapper.get('input#campParticipantPaymentAmount')
          .element as HTMLInputElement
      ).value
    ).toBe('')
  })

  it('records participant payment, refund, discount, and resignation through app-layer use cases', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    await wrapper.get('input#campParticipantPaymentAmount').setValue('125,50')
    await wrapper.get('input#campParticipantPaymentNote').setValue('gotówka')
    await wrapper.get('form#campParticipantPaymentForm').trigger('submit')
    await flushPromises()

    await findButton(wrapper, 'Zarejestruj zwrot').trigger('click')
    expect(wrapper.text()).toContain('Wpłacono')
    expect(
      (
        wrapper.get('input#campParticipantRefundAmount')
          .element as HTMLInputElement
      ).value
    ).toBe('300,00')
    await wrapper.get('input#campParticipantRefundAmount').setValue('75,25')
    await wrapper
      .get('input#campParticipantRefundNote')
      .setValue('przelew zwrotny')
    await wrapper.get('form#campParticipantRefundForm').trigger('submit')
    await flushPromises()

    await findButton(wrapper, 'Przyznaj zniżkę').trigger('click')
    await wrapper.get('input#campParticipantDiscountAmount').setValue('50')
    await wrapper
      .get('input#campParticipantDiscountReason')
      .setValue('rodzeństwo')
    await wrapper.get('form#campParticipantDiscountForm').trigger('submit')
    await flushPromises()

    await findButton(wrapper, 'Przyjmij rezygnację').trigger('click')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('input#campParticipantResignationDeposit').setValue('200')
    expect(wrapper.text()).toContain('100,00 PLN')
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
    expect(
      (
        wrapper.get('input#campParticipantResignationRefund')
          .element as HTMLInputElement
      ).value
    ).toBe('100,00')
    await wrapper.get('input#campParticipantResignationRefund').setValue('100')
    await wrapper.get('form#campParticipantResignationForm').trigger('submit')
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
    expect(mockRegisterRefundHandle).toHaveBeenCalledWith({
      amount: {
        amountMinor: 7525,
        currency: 'PLN'
      },
      campId: 'camp-winter-2026',
      note: 'przelew zwrotny',
      participantId: 'participant-1'
    })
    expect(mockRegisterDiscountHandle).toHaveBeenCalledWith({
      amount: {
        amountMinor: 5000,
        currency: 'PLN'
      },
      campId: 'camp-winter-2026',
      participantId: 'participant-1',
      reason: 'rodzeństwo'
    })
    expect(mockAcceptResignationHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026',
      nonRefundableDepositValue: {
        amountMinor: 20000,
        currency: 'PLN'
      },
      participantId: 'participant-1',
      refundedValue: {
        amountMinor: 10000,
        currency: 'PLN'
      }
    })
    expect(mockObserveCampParticipantDetailsHandle).toHaveBeenCalledTimes(1)
    expect(mockObserveCampParticipantPaymentHandle).toHaveBeenCalledTimes(1)
    expect(
      mockObserveCampParticipantActionsContextHandle
    ).toHaveBeenCalledTimes(1)
  })

  it('cancels participant resignation after confirmation through the app-layer use case', async () => {
    vi.useFakeTimers()
    actionsContextObservable = createObservable(
      createCampParticipantActionsContext({
        canAcceptResignation: false,
        canCancelResignation: true,
        canGrantDiscount: false,
        canRegisterPayment: false,
        canRegisterRefund: false,
        paymentPrefillAmount: null,
        refundableBalance: {
          amountMinor: 0,
          currency: 'PLN'
        },
        status: 'resigned'
      }),
      subscriptionUnsubscribeSpies
    )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Cofnij rezygnację')
    expect(wrapper.text()).not.toContain('Przyjmij rezygnację')

    await findButton(wrapper, 'Cofnij rezygnację').trigger('click')
    expect(wrapper.text()).toContain('Cofnąć rezygnację?')
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Obóz zimowy')

    await wrapper
      .get('[data-testid="campParticipantCancelResignationCancel"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockCancelResignationHandle).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Cofnąć rezygnację?')

    await findButton(wrapper, 'Cofnij rezygnację').trigger('click')
    await wrapper
      .get('[data-testid="campParticipantCancelResignationConfirm"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockCancelResignationHandle).toHaveBeenCalledWith({
      campId: 'camp-winter-2026',
      participantId: 'participant-1'
    })
  })

  it('keeps invalid payment input inside the actions component', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    await wrapper.get('input#campParticipantPaymentAmount').setValue('0')
    await wrapper.get('form#campParticipantPaymentForm').trigger('submit')

    expect(wrapper.text()).toContain('Podaj dodatnią kwotę wpłaty.')
    expect(mockRegisterPaymentHandle).not.toHaveBeenCalled()
  })

  it('keeps payments above the amount still due inside the actions component', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    expect(wrapper.text()).toContain('Do zapłaty')
    expect(wrapper.text()).toContain('500,00 PLN')

    await wrapper.get('input#campParticipantPaymentAmount').setValue('500,01')
    await wrapper.get('form#campParticipantPaymentForm').trigger('submit')

    expect(wrapper.text()).toContain(
      'Wpłata nie może być wyższa niż kwota do zapłaty.'
    )
    expect(mockRegisterPaymentHandle).not.toHaveBeenCalled()
  })

  it('keeps invalid refund input inside the actions component', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Zarejestruj zwrot').trigger('click')
    await wrapper.get('input#campParticipantRefundAmount').setValue('0')
    await wrapper.get('form#campParticipantRefundForm').trigger('submit')

    expect(wrapper.text()).toContain('Podaj dodatnią kwotę zwrotu.')
    expect(mockRegisterRefundHandle).not.toHaveBeenCalled()
  })

  it('keeps refunds above the refundable balance inside the actions component', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Zarejestruj zwrot').trigger('click')
    await wrapper.get('input#campParticipantRefundAmount').setValue('301')
    await wrapper.get('form#campParticipantRefundForm').trigger('submit')

    expect(wrapper.text()).toContain(
      'Zwrot nie może być wyższy niż kwota do zwrotu.'
    )
    expect(mockRegisterRefundHandle).not.toHaveBeenCalled()
  })

  it('keeps invalid resignation settlement inside the modal story', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij rezygnację').trigger('click')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('input#campParticipantResignationDeposit').setValue('200')
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
    await wrapper.get('input#campParticipantResignationRefund').setValue('200')
    await wrapper.get('form#campParticipantResignationForm').trigger('submit')

    expect(wrapper.text()).toContain(
      'Zwrot nie może być wyższy niż kwota do zwrotu.'
    )
    expect(mockAcceptResignationHandle).not.toHaveBeenCalled()
  })

  it('shows an observable error only in the affected section', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    paymentObservable = createErrorObservable(
      new Error('IndexedDB blocked'),
      subscriptionUnsubscribeSpies
    )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Przyjmij płatność')
    expect(wrapper.text()).toContain(
      'Nie udało się wczytać płatności uczestnika.'
    )
    expect(wrapper.text()).not.toContain('Nie udało się wczytać uczestnika.')
    expect(wrapper.text()).not.toContain(
      'Nie udało się wczytać akcji uczestnika.'
    )
  })

  it('unsubscribes section observables on route ID changes and unmount', async () => {
    const wrapper = mountView()
    await flushPromises()

    route.params.participantId = 'participant-2'
    await flushPromises()

    expect(subscriptionUnsubscribeSpies).toHaveLength(6)
    for (const unsubscribeSpy of subscriptionUnsubscribeSpies.slice(0, 3)) {
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
    }
    expect(mockObserveCampParticipantDetailsHandle).toHaveBeenLastCalledWith({
      campId: 'camp-winter-2026',
      participantId: 'participant-2'
    })
    expect(mockObserveCampParticipantPaymentHandle).toHaveBeenLastCalledWith({
      campId: 'camp-winter-2026',
      participantId: 'participant-2'
    })
    expect(
      mockObserveCampParticipantActionsContextHandle
    ).toHaveBeenLastCalledWith({
      campId: 'camp-winter-2026',
      participantId: 'participant-2'
    })

    wrapper.unmount()

    for (const unsubscribeSpy of subscriptionUnsubscribeSpies) {
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
    }
  })
})

function createRoute() {
  return reactive({
    params: {
      campId: 'camp-winter-2026',
      participantId: 'participant-1'
    }
  })
}

function createObservable<T>(
  value: T,
  unsubscribeSpies: Mock[],
  options: { emit?: boolean } = {}
): TestObservable<T> {
  const observers = new Set<TestObservableObserver<T>>()

  return {
    emit(nextValue: T) {
      observers.forEach((observer) => observer.next(nextValue))
    },
    fail(error: unknown) {
      observers.forEach((observer) => observer.error?.(error))
    },
    subscribe(observer: TestObservableObserver<T>) {
      observers.add(observer)

      if (options.emit !== false) {
        observer.next(value)
      }

      const unsubscribe = vi.fn(() => {
        observers.delete(observer)
      })
      unsubscribeSpies.push(unsubscribe)

      return {
        unsubscribe
      }
    }
  }
}

function createErrorObservable<T>(
  error: unknown,
  unsubscribeSpies: Mock[]
): TestObservable<T> {
  return {
    emit() {
      return undefined
    },
    fail() {
      return undefined
    },
    subscribe(observer: TestObservableObserver<T>) {
      observer.error?.(error)

      const unsubscribe = vi.fn()
      unsubscribeSpies.push(unsubscribe)

      return {
        unsubscribe
      }
    }
  }
}

function createCampParticipantDetails(
  overrides: Partial<CampParticipantDetails> = {}
): CampParticipantDetails {
  return {
    camp: {
      finishDate: new Date('2026-12-19T00:00:00Z'),
      name: 'Obóz zimowy',
      startDate: new Date('2026-12-12T00:00:00Z')
    },
    participant: {
      displayName: 'Amanda Nunes',
      status: 'registered'
    },
    ...overrides
  }
}

function createCampParticipantPayment(
  overrides: Partial<CampParticipantPayment> = {}
): CampParticipantPayment {
  return {
    basePrice: {
      amountMinor: 80000,
      currency: 'PLN'
    },
    amountDue: {
      amountMinor: 80000,
      currency: 'PLN'
    },
    discountSum: {
      amountMinor: 0,
      currency: 'PLN'
    },
    paidAmount: {
      amountMinor: 30000,
      currency: 'PLN'
    },
    paymentProgressPercent: 37,
    status: 'registered',
    ...overrides
  } as CampParticipantPayment
}

function createCampParticipantRefundPayment(
  overrides: Partial<CampParticipantPaymentRefund> = {}
): CampParticipantPaymentRefund {
  return {
    amountToRefund: {
      amountMinor: 30000,
      currency: 'PLN'
    },
    status: 'resigned',
    ...overrides
  }
}

function createCampParticipantActionsContext(
  overrides: Partial<CampParticipantActionsContext> = {}
): CampParticipantActionsContext {
  return {
    canAcceptResignation: true,
    canCancelResignation: false,
    canGrantDiscount: true,
    canRegisterPayment: true,
    canRegisterRefund: true,
    paymentPrefillAmount: {
      amountMinor: 50000,
      currency: 'PLN'
    },
    refundableBalance: {
      amountMinor: 30000,
      currency: 'PLN'
    },
    subject: {
      campName: 'Obóz zimowy',
      participantDisplayName: 'Amanda Nunes'
    },
    status: 'registered',
    ...overrides
  }
}
