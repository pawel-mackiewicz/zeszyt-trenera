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

  it('renders the shared age copy and normalizes the displayed range', () => {
    const wrapper = mountFilter({
      minBound: 5,
      maxBound: 80,
      minValue: 60,
      maxValue: 30
    })

    expect(wrapper.text()).toContain('Zakres wieku')
    expect(wrapper.text()).toContain('30 - 60 lat')
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
})
