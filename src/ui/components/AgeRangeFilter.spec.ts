import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'

describe('AgeRangeFilter', () => {
  function mountFilter(
    props: {
      minBound: number
      maxBound: number
      minValue: number
      maxValue: number
    },
    locale: 'pl' | 'en' = 'pl'
  ) {
    return mount(AgeRangeFilter, {
      props,
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('shows the coach the picked age range with the smaller age on the left', () => {
    const wrapper = mountFilter({
      minBound: 5,
      maxBound: 80,
      minValue: 60,
      maxValue: 30
    })

    expect(wrapper.find('.age-range-filter__label').text()).toBe('Zakres wieku')
    expect(wrapper.find('.age-range-filter__values').text()).toContain('Od')
    expect(wrapper.find('.age-range-filter__values').text()).toContain('Do')
    expect(wrapper.findAll('.age-range-filter__bound')).toHaveLength(0)
    expect(
      wrapper
        .findAll('.age-range-filter__value-prefix')
        .map((prefix) => prefix.text())
    ).toEqual(['Od', 'Do'])
    expect(
      wrapper
        .findAll('input[type="number"]')
        .map((input) => (input.element as HTMLInputElement).value)
    ).toEqual(['30', '60'])
    expect(
      wrapper
        .findAll('input[type="range"]')
        .map((input) => input.attributes('aria-label'))
    ).toEqual(['Maksymalny wiek, suwak', 'Minimalny wiek, suwak'])
    expect(
      wrapper
        .findAll('input[type="number"]')
        .map((input) => input.attributes('aria-label'))
    ).toEqual(['Minimalny wiek, wartość', 'Maksymalny wiek, wartość'])
  })

  it('edits the matching handle when crossed values are shown in visual age order', async () => {
    const wrapper = mountFilter(
      {
        minBound: 5,
        maxBound: 80,
        minValue: 60,
        maxValue: 30
      },
      'en'
    )

    const numberInputs = wrapper.findAll('input[type="number"]')
    const smallerAgeInput = numberInputs[0].element as HTMLInputElement
    const largerAgeInput = numberInputs[1].element as HTMLInputElement

    smallerAgeInput.value = '25'
    await numberInputs[0].trigger('input')
    largerAgeInput.value = '65'
    await numberInputs[1].trigger('input')

    expect(wrapper.emitted('update:maxValue')).toEqual([[25]])
    expect(wrapper.emitted('update:minValue')).toEqual([[65]])
  })

  it('emits numeric updates for both slider handles', async () => {
    const wrapper = mountFilter(
      {
        minBound: 5,
        maxBound: 80,
        minValue: 5,
        maxValue: 80
      },
      'en'
    )

    const sliders = wrapper.findAll('input[type="range"]')

    await sliders[0].setValue('12')
    await sliders[1].setValue('70')

    expect(wrapper.emitted('update:minValue')).toEqual([[12]])
    expect(wrapper.emitted('update:maxValue')).toEqual([[70]])
  })

  it('emits in-range number edits and clamps committed number values', async () => {
    const wrapper = mountFilter(
      {
        minBound: 5,
        maxBound: 80,
        minValue: 20,
        maxValue: 70
      },
      'en'
    )

    const numberInputs = wrapper.findAll('input[type="number"]')
    const minNumberInput = numberInputs[0].element as HTMLInputElement

    minNumberInput.value = '30'
    await numberInputs[0].trigger('input')
    minNumberInput.value = '2'
    await numberInputs[0].trigger('input')
    await numberInputs[0].trigger('blur')

    expect(wrapper.emitted('update:minValue')).toEqual([[30], [5]])
    expect(minNumberInput.value).toBe('5')
  })
})
