import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import {
  InvalidMemberPhoneNumberError,
  MemberAlreadyExistsError
} from '@/domain/model/member'
import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { createAppServicesProvides, type UiAppServices } from '@/ui/appServices'
import HomeView from '@/ui/views/HomeView.vue'

const {
  registerClubHandleMock,
  registerMemberHandleMock,
  registerTrainerHandleMock
} = vi.hoisted(() => ({
  registerClubHandleMock: vi.fn(),
  registerMemberHandleMock: vi.fn(),
  registerTrainerHandleMock: vi.fn()
}))

function mountHomeView() {
  // Tests stub the shared service bag so the view keeps the same seam it uses in production while avoiding real infra wiring.
  const appServices: UiAppServices = {
    useCases: {
      registerClub: {
        handle: registerClubHandleMock
      },
      registerMember: {
        handle: registerMemberHandleMock
      },
      registerTrainer: {
        handle: registerTrainerHandleMock
      }
    }
  }

  return mount(HomeView, {
    global: {
      provide: createAppServicesProvides(appServices)
    }
  })
}

describe('HomeView', () => {
  beforeEach(() => {
    registerClubHandleMock.mockReset()
    registerMemberHandleMock.mockReset()
    registerTrainerHandleMock.mockReset()
  })

  it('keeps the club submit disabled until both required fields are present', async () => {
    const wrapper = mountHomeView()

    const submitButton = wrapper.get('[data-testid="club-submit"]')

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#clubName').setValue('ZKS Wlokniarz Czestochowa')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#foundingDate').setValue('1946-01-01')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the trainer submit disabled until the trainer name is present', async () => {
    const wrapper = mountHomeView()

    const submitButton = wrapper.get('[data-testid="trainer-submit"]')

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#trainerName').setValue('Jane Doe')

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the member submit disabled until the required identity fields are present', async () => {
    const wrapper = mountHomeView()

    const submitButton = wrapper.get('[data-testid="member-submit"]')

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#memberFirstName').setValue('Jan')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#memberLastName').setValue('Kowalski')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#memberPhoneNumber').setValue('+48 123 456 789')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('submits the mapped register-club command and resets on success', async () => {
    registerClubHandleMock.mockResolvedValue(undefined)

    const wrapper = mountHomeView()

    await wrapper.get('#clubName').setValue('ZKS Wlokniarz Czestochowa')
    await wrapper.get('#foundingDate').setValue('1946-01-01')
    await wrapper
      .get('[data-testid="club-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(registerClubHandleMock).toHaveBeenCalledTimes(1)
    expect(registerTrainerHandleMock).not.toHaveBeenCalled()

    const command = registerClubHandleMock.mock.calls[0][0]
    expect(command.clubName).toBe('ZKS Wlokniarz Czestochowa')
    expect(command.foundingDate).toBeInstanceOf(Date)
    expect(command.foundingDate.toISOString()).toBe('1946-01-01T00:00:00.000Z')

    expect(wrapper.get('[data-testid="club-success"]').text()).toContain(
      'ZKS Wlokniarz Czestochowa saved offline.'
    )
    expect((wrapper.get('#clubName').element as HTMLInputElement).value).toBe(
      ''
    )
    expect(
      (wrapper.get('#foundingDate').element as HTMLInputElement).value
    ).toBe('')
  })

  it('shows an error and preserves form values when saving fails', async () => {
    registerClubHandleMock.mockRejectedValue(new Error('save failed'))

    const wrapper = mountHomeView()

    await wrapper.get('#clubName').setValue('Skra')
    await wrapper.get('#foundingDate').setValue('1926-03-08')
    await wrapper
      .get('[data-testid="club-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="club-error"]').text()).toContain(
      'Save failed.'
    )
    expect(wrapper.get('[data-testid="club-error"]').text()).toContain(
      'could not be saved locally'
    )
    expect((wrapper.get('#clubName').element as HTMLInputElement).value).toBe(
      'Skra'
    )
    expect(
      (wrapper.get('#foundingDate').element as HTMLInputElement).value
    ).toBe('1926-03-08')
  })

  it('shows a dedicated error when a club already exists', async () => {
    registerClubHandleMock.mockRejectedValue(new ClubAlreadyExistsError())

    const wrapper = mountHomeView()

    await wrapper.get('#clubName').setValue('Skra')
    await wrapper.get('#foundingDate').setValue('1926-03-08')
    await wrapper
      .get('[data-testid="club-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="club-error"]').text()).toContain(
      'Save failed.'
    )
    expect(wrapper.get('[data-testid="club-error"]').text()).toContain(
      'already registered on this device'
    )
    expect((wrapper.get('#clubName').element as HTMLInputElement).value).toBe(
      'Skra'
    )
    expect(
      (wrapper.get('#foundingDate').element as HTMLInputElement).value
    ).toBe('1926-03-08')
  })

  it('submits the mapped register-member command and resets on success', async () => {
    registerMemberHandleMock.mockResolvedValue(undefined)

    const wrapper = mountHomeView()

    await wrapper.get('#memberFirstName').setValue('Jan')
    await wrapper.get('#memberLastName').setValue('Kowalski')
    await wrapper.get('#memberPhoneNumber').setValue('+48 123 456 789')
    await wrapper.get('#memberDateOfBirth').setValue('2010-01-01')
    await wrapper.get('#memberJoinedAt').setValue('2024-09-01')
    await wrapper
      .get('[data-testid="member-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(registerMemberHandleMock).toHaveBeenCalledTimes(1)
    expect(registerClubHandleMock).not.toHaveBeenCalled()
    expect(registerTrainerHandleMock).not.toHaveBeenCalled()

    const command = registerMemberHandleMock.mock.calls[0][0]
    expect(command.firstName).toBe('Jan')
    expect(command.lastName).toBe('Kowalski')
    expect(command.phoneNumber).toBe('+48 123 456 789')
    // The UI fixes calendar-only input to UTC midnight so local-first persistence does not drift by timezone.
    expect(command.dateOfBirth.toISOString()).toBe('2010-01-01T00:00:00.000Z')
    expect(command.joinedAt.toISOString()).toBe('2024-09-01T00:00:00.000Z')

    expect(wrapper.get('[data-testid="member-success"]').text()).toContain(
      'Jan Kowalski saved offline.'
    )
    expect(
      (wrapper.get('#memberFirstName').element as HTMLInputElement).value
    ).toBe('')
    expect(
      (wrapper.get('#memberLastName').element as HTMLInputElement).value
    ).toBe('')
    expect(
      (wrapper.get('#memberPhoneNumber').element as HTMLInputElement).value
    ).toBe('')
    expect(
      (wrapper.get('#memberDateOfBirth').element as HTMLInputElement).value
    ).toBe('')
    expect(
      (wrapper.get('#memberJoinedAt').element as HTMLInputElement).value
    ).toBe('')
  })

  it('shows a dedicated member error when the phone number is not in international format', async () => {
    registerMemberHandleMock.mockRejectedValue(
      new InvalidMemberPhoneNumberError('123456789')
    )

    const wrapper = mountHomeView()

    await wrapper.get('#memberFirstName').setValue('Jan')
    await wrapper.get('#memberLastName').setValue('Kowalski')
    await wrapper.get('#memberPhoneNumber').setValue('123456789')
    await wrapper
      .get('[data-testid="member-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="member-error"]').text()).toContain(
      'Save failed.'
    )
    expect(wrapper.get('[data-testid="member-error"]').text()).toContain(
      'international format'
    )
    expect(
      (wrapper.get('#memberPhoneNumber').element as HTMLInputElement).value
    ).toBe('123456789')
  })

  it('shows a dedicated error when the member already exists', async () => {
    registerMemberHandleMock.mockRejectedValue(new MemberAlreadyExistsError())

    const wrapper = mountHomeView()

    await wrapper.get('#memberFirstName').setValue('Jan')
    await wrapper.get('#memberLastName').setValue('Kowalski')
    await wrapper.get('#memberPhoneNumber').setValue('+48 123 456 789')
    await wrapper
      .get('[data-testid="member-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="member-error"]').text()).toContain(
      'Save failed.'
    )
    expect(wrapper.get('[data-testid="member-error"]').text()).toContain(
      'already registered on this device'
    )
    expect(
      (wrapper.get('#memberFirstName').element as HTMLInputElement).value
    ).toBe('Jan')
    expect(
      (wrapper.get('#memberLastName').element as HTMLInputElement).value
    ).toBe('Kowalski')
    expect(
      (wrapper.get('#memberPhoneNumber').element as HTMLInputElement).value
    ).toBe('+48 123 456 789')
  })

  it('submits the mapped register-trainer command and resets on success', async () => {
    registerTrainerHandleMock.mockResolvedValue(undefined)

    const wrapper = mountHomeView()

    await wrapper.get('#trainerName').setValue('Jane Doe')
    await wrapper
      .get('[data-testid="trainer-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(registerTrainerHandleMock).toHaveBeenCalledTimes(1)
    expect(registerClubHandleMock).not.toHaveBeenCalled()
    expect(registerTrainerHandleMock).toHaveBeenCalledWith({
      trainerName: 'Jane Doe'
    })
    expect(wrapper.get('[data-testid="trainer-success"]').text()).toContain(
      'Jane Doe saved offline.'
    )
    expect(
      (wrapper.get('#trainerName').element as HTMLInputElement).value
    ).toBe('')
  })

  it('shows a trainer error and preserves the trainer value when saving fails', async () => {
    registerTrainerHandleMock.mockRejectedValue(new Error('save failed'))

    const wrapper = mountHomeView()

    await wrapper.get('#trainerName').setValue('Jane Doe')
    await wrapper
      .get('[data-testid="trainer-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="trainer-error"]').text()).toContain(
      'Save failed.'
    )
    expect(wrapper.get('[data-testid="trainer-error"]').text()).toContain(
      'could not be saved locally'
    )
    expect(
      (wrapper.get('#trainerName').element as HTMLInputElement).value
    ).toBe('Jane Doe')
  })

  it('shows a dedicated error when a trainer already exists', async () => {
    registerTrainerHandleMock.mockRejectedValue(new TrainerAlreadyExistsError())

    const wrapper = mountHomeView()

    await wrapper.get('#trainerName').setValue('Jane Doe')
    await wrapper
      .get('[data-testid="trainer-setup-form"]')
      .trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[data-testid="trainer-error"]').text()).toContain(
      'Save failed.'
    )
    expect(wrapper.get('[data-testid="trainer-error"]').text()).toContain(
      'already registered on this device'
    )
    expect(
      (wrapper.get('#trainerName').element as HTMLInputElement).value
    ).toBe('Jane Doe')
  })
})
