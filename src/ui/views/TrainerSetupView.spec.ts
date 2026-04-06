import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { useAppServices } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import { useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'
import TrainerSetupView from '@/ui/views/TrainerSetupView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))
vi.mock('@/ui/router/runtime', () => ({
  useRouter: vi.fn()
}))
vi.mock('@/ui/stores/app', () => ({
  useAppStore: vi.fn()
}))

describe('TrainerSetupView', () => {
  let mockRegisterTrainerHandle: Mock
  let mockRouterPush: Mock
  let mockSetTrainerSetupSkipped: Mock

  beforeEach(() => {
    mockRegisterTrainerHandle = vi.fn().mockResolvedValue(undefined)
    mockRouterPush = vi.fn().mockResolvedValue(undefined)
    mockSetTrainerSetupSkipped = vi.fn()

    vi.mocked(useAppServices).mockReturnValue({
      useCases: {
        registerTrainer: {
          handle: mockRegisterTrainerHandle
        }
      } as unknown,
      queries: {} as unknown
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useAppStore).mockReturnValue({
      setTrainerSetupSkipped: mockSetTrainerSetupSkipped
    } as unknown as ReturnType<typeof useAppStore>)
  })

  function mountView(locale: 'pl' | 'en' = 'pl') {
    return mount(TrainerSetupView, {
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('submits the trainer identity through the application layer', async () => {
    const wrapper = mountView()

    await wrapper.find('input[id="trainerName"]').setValue('  Jan Kowalski  ')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockRegisterTrainerHandle).toHaveBeenCalledWith({
      trainerName: 'Jan Kowalski'
    })
  })

  it('keeps the blank-name validation inside the local setup dictionary', async () => {
    const wrapper = mountView()

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Podaj nazwę trenera.')
    expect(mockRegisterTrainerHandle).not.toHaveBeenCalled()
  })

  it('shows a friendly message when the trainer is already registered locally', async () => {
    mockRegisterTrainerHandle.mockRejectedValue(new TrainerAlreadyExistsError())

    const wrapper = mountView()

    await wrapper.find('input[id="trainerName"]').setValue('Jan Kowalski')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain(
      'Trener jest już zapisany na tym urządzeniu.'
    )
  })

  it('renders the local English onboarding copy', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('Add the trainer')
    expect(wrapper.text()).toContain('Save trainer')
  })

  it('allows skipping trainer setup and routes to the members screen', async () => {
    const wrapper = mountView()

    await wrapper.find('button[type="button"]').trigger('click')

    expect(mockSetTrainerSetupSkipped).toHaveBeenCalledWith(true)
    expect(mockRouterPush).toHaveBeenCalledWith('/member')
    expect(mockRegisterTrainerHandle).not.toHaveBeenCalled()
  })
})
