import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { createAppServicesProvides, type UiAppServices } from '@/ui/appServices'
import HomeView from '@/ui/views/HomeView.vue'

const { registerClubHandleMock, registerTrainerHandleMock } = vi.hoisted(
  () => ({
    registerClubHandleMock: vi.fn(),
    registerTrainerHandleMock: vi.fn()
  })
)

function mountHomeView() {
  // Tests stub the shared service bag so the view keeps the same seam it uses in production while avoiding real infra wiring.
  const appServices: UiAppServices = {
    useCases: {
      registerClub: {
        handle: registerClubHandleMock
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
