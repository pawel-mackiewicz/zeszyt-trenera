import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { TrainerAlreadyExistsError } from '@/write/domain/model/Trainer'
import { useAppServices } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import TrainerSetupView from '@/ui/views/setup/TrainerSetupView.vue'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('TrainerSetupView', () => {
  let mockRegisterTrainerHandle: Mock

  beforeEach(() => {
    mockRegisterTrainerHandle = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useAppServices).mockReturnValue({
      useCases: {
        registerTrainer: {
          handle: mockRegisterTrainerHandle
        }
      } as unknown,
      queries: {} as unknown
    } as unknown as ReturnType<typeof useAppServices>)
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

  it('shows the setup error in the floating alert and lets the user dismiss it', async () => {
    mockRegisterTrainerHandle.mockRejectedValue(new TrainerAlreadyExistsError())

    const wrapper = mountView('en')

    await wrapper.find('input[id="trainerName"]').setValue('Jane Doe')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'The trainer is already saved on this device.'
    )

    await wrapper.find('button[type="button"]').trigger('click')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('renders the local English onboarding copy', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('Add the trainer')
    expect(wrapper.text()).toContain('Save trainer')
  })
})
