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

  it('renders the shared age copy, bounds, and editable values', () => {
    const wrapper = mountFilter({
      minBound: 5,
      maxBound: 80,
      minValue: 60,
      maxValue: 30
    })

    expect(wrapper.text()).toContain('Zakres wieku')
    expect(
      wrapper.findAll('.age-range-filter__bound').map((bound) => bound.text())
    ).toEqual(['5', '80'])
    expect(
      wrapper
        .findAll('input[type="number"]')
        .map((input) => (input.element as HTMLInputElement).value)
    ).toEqual(['60', '30'])
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
