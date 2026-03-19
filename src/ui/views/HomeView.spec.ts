import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClubAlreadyExistsError } from '@/domain/model/club'
import { createAppServicesProvides, type UiAppServices } from '@/ui/appServices'
import HomeView from '@/ui/views/HomeView.vue'

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn()
}))

function mountHomeView() {
  // Tests stub the shared service bag so the view keeps the same seam it uses in production while avoiding real infra wiring.
  const appServices: UiAppServices = {
    useCases: {
      registerClub: {
        handle: handleMock
      },
      registerTrainer: {
        handle: vi.fn()
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
    handleMock.mockReset()
  })

  it('keeps submit disabled until both required fields are present', async () => {
    const wrapper = mountHomeView()

    const submitButton = wrapper.get('button[type="submit"]')

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#clubName').setValue('ZKS Wlokniarz Czestochowa')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('#foundingDate').setValue('1946-01-01')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('submits the mapped register-club command and resets on success', async () => {
    handleMock.mockResolvedValue(undefined)

    const wrapper = mountHomeView()

    await wrapper.get('#clubName').setValue('ZKS Wlokniarz Czestochowa')
    await wrapper.get('#foundingDate').setValue('1946-01-01')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(handleMock).toHaveBeenCalledTimes(1)

    const command = handleMock.mock.calls[0][0]
    expect(command.clubName).toBe('ZKS Wlokniarz Czestochowa')
    expect(command.foundingDate).toBeInstanceOf(Date)
    expect(command.foundingDate.toISOString()).toBe('1946-01-01T00:00:00.000Z')

    expect(wrapper.text()).toContain('saved offline')
    expect(wrapper.text()).toContain('ZKS Wlokniarz Czestochowa')
    expect((wrapper.get('#clubName').element as HTMLInputElement).value).toBe(
      ''
    )
    expect(
      (wrapper.get('#foundingDate').element as HTMLInputElement).value
    ).toBe('')
  })

  it('shows an error and preserves form values when saving fails', async () => {
    handleMock.mockRejectedValue(new Error('save failed'))

    const wrapper = mountHomeView()

    await wrapper.get('#clubName').setValue('Skra')
    await wrapper.get('#foundingDate').setValue('1926-03-08')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Save failed.')
    expect(wrapper.text()).toContain('could not be saved locally')
    expect((wrapper.get('#clubName').element as HTMLInputElement).value).toBe(
      'Skra'
    )
    expect(
      (wrapper.get('#foundingDate').element as HTMLInputElement).value
    ).toBe('1926-03-08')
  })

  it('shows a dedicated error when a club already exists', async () => {
    handleMock.mockRejectedValue(new ClubAlreadyExistsError())

    const wrapper = mountHomeView()

    await wrapper.get('#clubName').setValue('Skra')
    await wrapper.get('#foundingDate').setValue('1926-03-08')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Save failed.')
    expect(wrapper.text()).toContain('already registered on this device')
    expect((wrapper.get('#clubName').element as HTMLInputElement).value).toBe(
      'Skra'
    )
    expect(
      (wrapper.get('#foundingDate').element as HTMLInputElement).value
    ).toBe('1926-03-08')
  })
})
