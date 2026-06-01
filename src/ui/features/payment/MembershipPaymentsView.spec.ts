import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { MembershipPaymentAlreadyExistsError } from '@/write/domain/model/MembershipPayment'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import { createAppI18n } from '@/ui/i18n'
import { useAppServices } from '@/ui/appServices'
import MembershipPaymentsView from '@/ui/features/payment/MembershipPaymentsView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

type MembershipPaymentsResult = {
  paidMembers: Array<{
    id: string
    membershipPaymentId: string
    firstName: string
    lastName: string
    dateOfBirth: Date
    hasPhoneNumber: boolean
  }>
  unpaidAbsentMembers: Array<{
    id: string
    firstName: string
    lastName: string
    dateOfBirth: Date
    hasPhoneNumber: boolean
  }>
  unpaidAttendedMembers: Array<{
    id: string
    firstName: string
    lastName: string
    dateOfBirth: Date
    hasPhoneNumber: boolean
    attendanceSessionIds: string[]
  }>
}

function createObservable(
  result: MembershipPaymentsResult,
  unsubscribeSpies: Mock[]
) {
  return {
    subscribe(observer: {
      next: (value: MembershipPaymentsResult) => void
      error?: (error: unknown) => void
    }) {
      observer.next(result)

      const unsubscribe = vi.fn()
      unsubscribeSpies.push(unsubscribe)

      return {
        unsubscribe
      }
    }
  }
}

function createErrorObservable(error: unknown, unsubscribeSpies: Mock[]) {
  return {
    subscribe(observer: {
      next: (value: MembershipPaymentsResult) => void
      error?: (error: unknown) => void
    }) {
      observer.error?.(error)

      const unsubscribe = vi.fn()
      unsubscribeSpies.push(unsubscribe)

      return {
        unsubscribe
      }
    }
  }
}

describe('MembershipPaymentsView', () => {
  let mockObserveMembershipPaymentStatusByMonthHandle: Mock
  let mockRegisterMembershipPaymentHandle: Mock
  let mockDeleteMembershipPaymentHandle: Mock
  let mockSendMembershipPaymentReminderHandle: Mock
  let subscriptionUnsubscribeSpies: Mock[]
  let currentResult: MembershipPaymentsResult

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 24, 18, 0, 0))

    currentResult = {
      paidMembers: [
        {
          id: 'paid-1',
          membershipPaymentId: 'payment-paid-1',
          firstName: 'Amanda',
          lastName: 'Nunes',
          dateOfBirth: new Date('1988-05-30T00:00:00Z'),
          hasPhoneNumber: true
        }
      ],
      unpaidAbsentMembers: [
        {
          id: 'absent-1',
          firstName: 'Georges',
          lastName: 'St-Pierre',
          dateOfBirth: new Date('1981-05-19T00:00:00Z'),
          hasPhoneNumber: true
        },
        {
          id: 'unknown-age-1',
          firstName: 'Mystery',
          lastName: 'Member',
          dateOfBirth: new Date('2018-01-01T00:00:00Z'),
          hasPhoneNumber: false
        }
      ],
      unpaidAttendedMembers: [
        {
          id: 'attended-1',
          firstName: 'Royce',
          lastName: 'Gracie',
          dateOfBirth: new Date('1966-12-12T00:00:00Z'),
          hasPhoneNumber: true,
          attendanceSessionIds: ['session-1', 'session-2']
        }
      ]
    }

    mockObserveMembershipPaymentStatusByMonthHandle = vi.fn(() =>
      createObservable(currentResult, subscriptionUnsubscribeSpies)
    )
    mockRegisterMembershipPaymentHandle = vi.fn().mockResolvedValue(undefined)
    mockDeleteMembershipPaymentHandle = vi.fn().mockResolvedValue(undefined)
    mockSendMembershipPaymentReminderHandle = vi
      .fn()
      .mockResolvedValue(undefined)
    subscriptionUnsubscribeSpies = []

    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        listAttendanceSessionsByMonth: {
          handle: vi.fn()
        },
        observeMembershipPaymentStatusByMonth: {
          handle: mockObserveMembershipPaymentStatusByMonthHandle
        }
      },
      useCases: {
        registerAttendanceList: { handle: vi.fn() },
        registerClub: { handle: vi.fn() },
        registerMember: { handle: vi.fn() },
        registerMembershipPayment: {
          handle: mockRegisterMembershipPaymentHandle
        },
        deleteMembershipPayment: {
          handle: mockDeleteMembershipPaymentHandle
        },
        sendMembershipPaymentReminder: {
          handle: mockSendMembershipPaymentReminderHandle
        },
        registerTrainer: { handle: vi.fn() }
      }
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(MembershipPaymentsView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('loads the current month on mount through the shared payments query', async () => {
    mountView()
    await flushPromises()

    expect(
      mockObserveMembershipPaymentStatusByMonthHandle
    ).toHaveBeenCalledWith({
      month: new Date(2026, 9, 1)
    })
  })

  it('resubscribes when the shared month selector emits a different month', async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper
      .getComponent(MonthSelector)
      .vm.$emit('update:modelValue', new Date(2026, 8, 1))
    await flushPromises()
    wrapper
      .getComponent(MonthSelector)
      .vm.$emit('update:modelValue', new Date(2026, 9, 1))
    await flushPromises()

    expect(
      mockObserveMembershipPaymentStatusByMonthHandle
    ).toHaveBeenNthCalledWith(2, {
      month: new Date(2026, 8, 1)
    })
    expect(
      mockObserveMembershipPaymentStatusByMonthHandle
    ).toHaveBeenNthCalledWith(3, {
      month: new Date(2026, 9, 1)
    })
  })

  it('renders the three monthly payment buckets from the live query result', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Obecni i nieopłacili')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).toContain('2 TR.')
    expect(wrapper.text()).toContain('Nieobecni i nieopłacili')
    expect(wrapper.text()).toContain('Georges St-Pierre')
    expect(wrapper.text()).toContain('Opłacili')
    expect(wrapper.text()).toContain('Amanda Nunes')
  })

  it('renders remind actions and disables reminder for members without a phone number', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(
      wrapper.get('#payments-remind-attended-1').attributes('disabled')
    ).toBeUndefined()
    expect(
      wrapper.get('#payments-remind-absent-1').attributes('disabled')
    ).toBeUndefined()
    expect(
      wrapper.get('#payments-remind-unknown-age-1').attributes('disabled')
    ).toBeDefined()
  })

  it('delegates SMS reminder composition to the application use case', async () => {
    const wrapper = mountView('en')
    await flushPromises()

    await wrapper.get('#payments-remind-attended-1').trigger('click')
    await flushPromises()

    expect(mockSendMembershipPaymentReminderHandle).toHaveBeenCalledWith({
      memberId: 'attended-1',
      coveredMonth: '2026-10',
      locale: 'en'
    })
  })

  it('applies search and age filtering in the UI only', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-search').setValue('georges')
    expect(wrapper.text()).toContain('Georges St-Pierre')
    expect(wrapper.text()).not.toContain('Royce Gracie')

    await wrapper.get('#payments-search').setValue('')
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[1].setValue('7')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Georges St-Pierre')
    expect(wrapper.text()).not.toContain('Mystery Member')
    expect(wrapper.text()).toContain('Brak wyników dla tego filtra')
  })

  it('applies normalized age-range filtering when slider handles cross', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Mystery Member')

    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue('60')
    await sliders[1].setValue('30')
    await flushPromises()

    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Georges St-Pierre')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).not.toContain('Mystery Member')
  })

  it('sorts ledger rows by the formatted member name', async () => {
    currentResult = {
      paidMembers: [],
      unpaidAbsentMembers: [
        {
          id: 'absent-z',
          firstName: 'Zachary',
          lastName: 'Zulu',
          dateOfBirth: new Date('1984-01-01T00:00:00Z'),
          hasPhoneNumber: true
        },
        {
          id: 'absent-a',
          firstName: 'Adam',
          lastName: 'Alpha',
          dateOfBirth: new Date('1985-01-01T00:00:00Z'),
          hasPhoneNumber: true
        }
      ],
      unpaidAttendedMembers: []
    }

    const wrapper = mountView()
    await flushPromises()

    const rows = wrapper.findAll('.payments-member-row')

    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Adam Alpha')
    expect(rows[1].text()).toContain('Zachary Zulu')
  })

  it('shows a retry state when the monthly ledger load fails and reloads on demand', async () => {
    mockObserveMembershipPaymentStatusByMonthHandle
      .mockImplementationOnce(() =>
        createErrorObservable(new Error('boom'), subscriptionUnsubscribeSpies)
      )
      .mockImplementationOnce(() =>
        createObservable(currentResult, subscriptionUnsubscribeSpies)
      )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Nie udało się wczytać miesięcznego statusu płatności.'
    )
    expect(wrapper.text()).toContain('Spróbuj ponownie')

    await wrapper.get('.payments-state-card button').trigger('click')
    await flushPromises()

    expect(
      mockObserveMembershipPaymentStatusByMonthHandle
    ).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Royce Gracie')
  })

  it('unsubscribes the live ledger query when the component unmounts', async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.unmount()

    expect(subscriptionUnsubscribeSpies[0]).toHaveBeenCalledTimes(1)
  })

  it('opens a confirmation dialog with the selected member and covered month', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-attended-1').trigger('click')

    expect(wrapper.text()).toContain('Przyjmij Płatność')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).toContain('październik 2026')
    expect(
      wrapper
        .get('[data-testid="payment-confirmation-charged-amount"]')
        .attributes('inputmode')
    ).toBe('decimal')
    expect(wrapper.text()).toContain('2 treningi w tym miesiącu')

    await wrapper
      .get('.payments-confirmation__actions')
      .findAll('button')[1]
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Przyjmij Płatność')
  })

  it('records the selected payment only after confirmation', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .get('[data-testid="payment-confirmation-charged-amount"]')
      .setValue('175,50')
    await wrapper
      .find('.payments-confirmation__actions button')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockRegisterMembershipPaymentHandle).toHaveBeenCalledWith({
      memberId: 'absent-1',
      coveredMonth: '2026-10',
      chargedAmount: {
        amountMinor: 17_550,
        currency: 'PLN'
      }
    })
    expect(wrapper.text()).not.toContain('Przyjmij Płatność')
  })

  it('closes the dialog and shows non-blocking feedback when the payment already exists', async () => {
    mockRegisterMembershipPaymentHandle.mockRejectedValue(
      new MembershipPaymentAlreadyExistsError()
    )

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .get('[data-testid="payment-confirmation-charged-amount"]')
      .setValue('160')
    await wrapper
      .find('.payments-confirmation__actions button')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Przyjmij Płatność')
    expect(wrapper.text()).toContain(
      'Płatność od Georges St-Pierre za Październik 2026 jest już zapisana.'
    )
  })

  it('keeps the dialog open and hides low-level details when saving fails unexpectedly', async () => {
    mockRegisterMembershipPaymentHandle.mockRejectedValue(new Error('boom'))

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .get('[data-testid="payment-confirmation-charged-amount"]')
      .setValue('160')
    await wrapper
      .find('.payments-confirmation__actions button')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Nie udało się zapisać płatności')
    expect(wrapper.text()).toContain(
      'Spróbuj ponownie. Ten ekran nie zapisał jeszcze zmiany.'
    )
    expect(wrapper.text()).not.toContain('boom')
    expect(wrapper.text()).toContain('Przyjmij Płatność')
  })

  it('disables the confirm action while the payment write is pending', async () => {
    const pendingPayment = {
      resolve: null as null | (() => void)
    }

    mockRegisterMembershipPaymentHandle.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingPayment.resolve = resolve
        })
    )

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .get('[data-testid="payment-confirmation-charged-amount"]')
      .setValue('160')
    const confirmButton = wrapper.get('.payments-confirmation__actions button')
    await confirmButton.trigger('click')
    await flushPromises()

    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(confirmButton.text()).toBe('Zapisywanie...')

    if (pendingPayment.resolve === null) {
      throw new Error('Payment promise was not captured')
    }

    pendingPayment.resolve()
    await flushPromises()
  })

  it('opens a delete confirmation dialog for a recorded payment', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-delete-paid-1').trigger('click')

    expect(wrapper.text()).toContain('Usunąć zapisaną płatność?')
    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('październik 2026')

    await wrapper
      .get('[data-testid="payment-delete-confirmation-cancel"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Usunąć zapisaną płatność?')
  })

  it('deletes the selected recorded payment only after confirmation', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-delete-paid-1').trigger('click')
    await wrapper
      .get('[data-testid="payment-delete-confirmation-confirm"]')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockDeleteMembershipPaymentHandle).toHaveBeenCalledWith({
      membershipPaymentId: 'payment-paid-1'
    })
    expect(wrapper.text()).not.toContain('Usunąć zapisaną płatność?')
  })

  it('keeps the delete dialog open and hides low-level details when deleting fails unexpectedly', async () => {
    mockDeleteMembershipPaymentHandle.mockRejectedValue(new Error('boom'))

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-delete-paid-1').trigger('click')
    await wrapper
      .get('[data-testid="payment-delete-confirmation-confirm"]')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Nie udało się usunąć płatności')
    expect(wrapper.text()).toContain(
      'Spróbuj ponownie. Ten ekran nie usunął jeszcze płatności.'
    )
    expect(wrapper.text()).not.toContain('boom')
    expect(wrapper.text()).toContain('Usunąć zapisaną płatność?')
  })
})
