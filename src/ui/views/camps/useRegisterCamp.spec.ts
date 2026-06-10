import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvalidCampStartDateError } from '@/write/camps/domain/Camp'
import { useAppServices } from '@/ui/appServices'
import { useRouter } from '@/ui/router/runtime'
import { useRegisterCamp } from '@/ui/views/camps/useRegisterCamp'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  useRouter: vi.fn()
}))

describe('useRegisterCamp', () => {
  let handleRegisterCamp: ReturnType<typeof vi.fn>
  let replace: ReturnType<typeof vi.fn>

  beforeEach(() => {
    handleRegisterCamp = vi.fn().mockResolvedValue(undefined)
    replace = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useAppServices).mockReturnValue({
      useCases: {
        registerCamp: {
          handle: handleRegisterCamp
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(useRouter).mockReturnValue({
      replace
    } as unknown as ReturnType<typeof useRouter>)
  })

  it('submits a register-camp command through the application layer', async () => {
    const registration = useRegisterCamp()

    registration.form.name = '  Winter camp  '
    registration.form.startDate = '2099-01-10'
    registration.form.finishDate = '2099-01-17'
    registration.form.price = '2000,50'
    registration.form.note = '  Advanced group  '

    await registration.submit()

    expect(handleRegisterCamp).toHaveBeenCalledWith({
      name: 'Winter camp',
      startDate: new Date('2099-01-10T00:00:00Z'),
      finishDate: new Date('2099-01-17T00:00:00Z'),
      price: {
        amountMinor: 200_050,
        currency: 'PLN'
      },
      note: 'Advanced group'
    })
    expect(replace).toHaveBeenCalledWith('/camps')
    expect(registration.submitErrorKey.value).toBeNull()
  })

  it('requires all mandatory fields before writing', async () => {
    const registration = useRegisterCamp()

    registration.form.name = 'Winter camp'
    registration.form.startDate = '2099-01-10'
    registration.form.finishDate = '2099-01-17'

    await registration.submit()

    expect(handleRegisterCamp).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(registration.submitErrorKey.value).toBe('required')
  })

  it('rejects malformed prices before writing', async () => {
    const registration = useRegisterCamp()

    registration.form.name = 'Winter camp'
    registration.form.startDate = '2099-01-10'
    registration.form.finishDate = '2099-01-17'
    registration.form.price = '12.999'

    await registration.submit()

    expect(handleRegisterCamp).not.toHaveBeenCalled()
    expect(registration.submitErrorKey.value).toBe('invalidPrice')
  })

  it('rejects a finish date that is not after the start date', async () => {
    const registration = useRegisterCamp()

    registration.form.name = 'Winter camp'
    registration.form.startDate = '2099-01-17'
    registration.form.finishDate = '2099-01-10'
    registration.form.price = '2000'

    await registration.submit()

    expect(handleRegisterCamp).not.toHaveBeenCalled()
    expect(registration.submitErrorKey.value).toBe('invalidFinishDate')
  })

  it('maps application errors to form error keys', async () => {
    handleRegisterCamp.mockRejectedValue(new InvalidCampStartDateError())
    const registration = useRegisterCamp()

    registration.form.name = 'Winter camp'
    registration.form.startDate = '2020-01-10'
    registration.form.finishDate = '2020-01-17'
    registration.form.price = '2000'

    await registration.submit()

    expect(registration.submitErrorKey.value).toBe('invalidStartDate')
    expect(replace).not.toHaveBeenCalled()
  })
})
