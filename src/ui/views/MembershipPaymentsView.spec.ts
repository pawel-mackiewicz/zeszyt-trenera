import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { MembershipPaymentAlreadyExistsError } from '@/domain/model/MembershipPayment'
import MonthSelector from '@/ui/components/MonthSelector.vue'
import { createAppI18n } from '@/ui/i18n'
import { useAppServices } from '@/ui/appServices'
import MembershipPaymentsView from '@/ui/views/MembershipPaymentsView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

type MembershipPaymentsResult = {
  paidMembers: Array<{
    id: string
    firstName: string
    lastName: string
    dateOfBirth?: Date
  }>
  unpaidAbsentMembers: Array<{
    id: string
    firstName: string
    lastName: string
    dateOfBirth?: Date
  }>
  unpaidAttendedMembers: Array<{
    id: string
    firstName: string
    lastName: string
    dateOfBirth?: Date
    attendanceSessionIds: string[]
  }>
}

function createObservable(result: MembershipPaymentsResult) {
  return {
    subscribe(observer: {
      next: (value: MembershipPaymentsResult) => void
      error?: (error: unknown) => void
    }) {
      observer.next(result)

      return {
        unsubscribe: vi.fn()
      }
    }
  }
}

describe('MembershipPaymentsView', () => {
  let mockObserveMembershipPaymentStatusByMonthHandle: Mock
  let mockRegisterMembershipPaymentHandle: Mock
  let currentResult: MembershipPaymentsResult

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 24, 18, 0, 0))

    currentResult = {
      paidMembers: [
        {
          id: 'paid-1',
          firstName: 'Amanda',
          lastName: 'Nunes',
          dateOfBirth: new Date('1988-05-30T00:00:00Z')
        }
      ],
      unpaidAbsentMembers: [
        {
          id: 'absent-1',
          firstName: 'Georges',
          lastName: 'St-Pierre',
          dateOfBirth: new Date('1981-05-19T00:00:00Z')
        },
        {
          id: 'unknown-age-1',
          firstName: 'Mystery',
          lastName: 'Member'
        }
      ],
      unpaidAttendedMembers: [
        {
          id: 'attended-1',
          firstName: 'Royce',
          lastName: 'Gracie',
          dateOfBirth: new Date('1966-12-12T00:00:00Z'),
          attendanceSessionIds: ['session-1', 'session-2']
        }
      ]
    }

    mockObserveMembershipPaymentStatusByMonthHandle = vi.fn(() =>
      createObservable(currentResult)
    )
    mockRegisterMembershipPaymentHandle = vi.fn().mockResolvedValue(undefined)

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

  it('applies search and age filtering in the UI only', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-search').setValue('georges')
    expect(wrapper.text()).toContain('Georges St-Pierre')
    expect(wrapper.text()).not.toContain('Royce Gracie')

    await wrapper.get('#payments-search').setValue('')
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[1].setValue('20')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Georges St-Pierre')
    expect(wrapper.text()).not.toContain('Mystery Member')
    expect(wrapper.text()).toContain('Brak wyników dla tego filtra')
  })

  it('keeps unknown ages at the default range and normalizes crossed handles', async () => {
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

  it('opens a confirmation dialog with the selected member and covered month', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-attended-1').trigger('click')

    expect(wrapper.text()).toContain('Oznaczyć składkę jako opłaconą?')
    expect(wrapper.text()).toContain('Royce Gracie')
    expect(wrapper.text()).toContain('październik 2026')
    expect(wrapper.text()).toContain('2 treningi w tym miesiącu')

    await wrapper
      .get('.payments-confirmation__actions')
      .findAll('button')[1]
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Oznaczyć składkę jako opłaconą?')
  })

  it('records the selected payment only after confirmation', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .find('.payments-confirmation__actions button')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(mockRegisterMembershipPaymentHandle).toHaveBeenCalledWith({
      memberId: 'absent-1',
      coveredMonth: '2026-10'
    })
    expect(wrapper.text()).not.toContain('Oznaczyć składkę jako opłaconą?')
  })

  it('closes the dialog and shows non-blocking feedback when the payment already exists', async () => {
    mockRegisterMembershipPaymentHandle.mockRejectedValue(
      new MembershipPaymentAlreadyExistsError()
    )

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .find('.payments-confirmation__actions button')
      .trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Oznaczyć składkę jako opłaconą?')
    expect(wrapper.text()).toContain(
      'Płatność od Georges St-Pierre za październik 2026 jest już zapisana.'
    )
  })

  it('keeps the dialog open and hides low-level details when saving fails unexpectedly', async () => {
    mockRegisterMembershipPaymentHandle.mockRejectedValue(new Error('boom'))

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('#payments-open-confirm-absent-1').trigger('click')
    await wrapper
      .find('.payments-confirmation__actions button')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Nie udało się zapisać płatności')
    expect(wrapper.text()).toContain(
      'Spróbuj ponownie. Ten ekran nie zapisał jeszcze zmiany.'
    )
    expect(wrapper.text()).not.toContain('boom')
    expect(wrapper.text()).toContain('Oznaczyć składkę jako opłaconą?')
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
})
