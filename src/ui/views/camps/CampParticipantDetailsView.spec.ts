import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { reactive } from 'vue'

import type { CampParticipantActionsContext } from '@/read/ObserveCampParticipantActionsContextQuery'
import type { CampParticipantDetails } from '@/read/ObserveCampParticipantDetailsQuery'
import type { CampParticipantPayment } from '@/read/ObserveCampParticipantPaymentQuery'
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
  let mockAcceptResignationHandle: Mock
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
    mockAcceptResignationHandle = vi.fn().mockResolvedValue(undefined)

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
        registerCampParticipantDiscount: {
          handle: mockRegisterDiscountHandle
        },
        registerCampParticipantPayment: {
          handle: mockRegisterPaymentHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRoute).mockReturnValue(
      route as unknown as ReturnType<typeof useRoute>
    )
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
        amountDue: {
          amountMinor: 90000,
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
    expect(wrapper.text()).toContain('900,00')
    expect(mockObserveCampParticipantDetailsHandle).toHaveBeenCalledTimes(1)
    expect(mockObserveCampParticipantPaymentHandle).toHaveBeenCalledTimes(1)
  })

  it('prefills a received payment from the actions context read', async () => {
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

    expect(
      (
        wrapper.get('input#campParticipantPaymentAmount')
          .element as HTMLInputElement
      ).value
    ).toBe('444,00')
  })

  it('records participant payment, discount, and resignation through app-layer use cases', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    await wrapper.get('input#campParticipantPaymentAmount').setValue('125,50')
    await wrapper.get('input#campParticipantPaymentNote').setValue('gotówka')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await findButton(wrapper, 'Przyznaj zniżkę').trigger('click')
    await wrapper.get('input#campParticipantDiscountAmount').setValue('50')
    await wrapper
      .get('input#campParticipantDiscountReason')
      .setValue('rodzeństwo')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await findButton(wrapper, 'Przyjmij rezygnację').trigger('click')
    await wrapper.get('input#campParticipantResignationDeposit').setValue('200')
    await wrapper
      .get('input#campParticipantResignationRefund')
      .setValue('300,25')
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
        amountMinor: 30025,
        currency: 'PLN'
      }
    })
    expect(mockObserveCampParticipantDetailsHandle).toHaveBeenCalledTimes(1)
    expect(mockObserveCampParticipantPaymentHandle).toHaveBeenCalledTimes(1)
    expect(
      mockObserveCampParticipantActionsContextHandle
    ).toHaveBeenCalledTimes(1)
  })

  it('keeps invalid payment input inside the actions component', async () => {
    const wrapper = mountView()
    await flushPromises()

    await findButton(wrapper, 'Przyjmij płatność').trigger('click')
    await wrapper.get('input#campParticipantPaymentAmount').setValue('0')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Podaj dodatnią kwotę wpłaty.')
    expect(mockRegisterPaymentHandle).not.toHaveBeenCalled()
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
    amountDue: {
      amountMinor: 80000,
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

function createCampParticipantActionsContext(
  overrides: Partial<CampParticipantActionsContext> = {}
): CampParticipantActionsContext {
  return {
    canAcceptResignation: true,
    canGrantDiscount: true,
    canRegisterPayment: true,
    paymentPrefillAmount: {
      amountMinor: 50000,
      currency: 'PLN'
    },
    status: 'registered',
    ...overrides
  }
}
