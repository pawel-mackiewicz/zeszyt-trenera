import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { TrainerAlreadyExistsError } from '@/domain/model/trainer'
import { useAppServices } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import TrainerSetupView from '@/ui/views/TrainerSetupView.vue'

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

  it('renders the local English onboarding copy', () => {
    const wrapper = mountView('en')

    expect(wrapper.text()).toContain('Add the trainer')
    expect(wrapper.text()).toContain('Save trainer')
  })
})
