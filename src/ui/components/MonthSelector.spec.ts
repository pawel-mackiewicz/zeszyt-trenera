import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import MonthSelector from '@/ui/components/MonthSelector.vue'
import { createAppI18n } from '@/ui/i18n'

function mountSelector(modelValue: Date, locale: 'pl' | 'en' = 'pl') {
  return mount(MonthSelector, {
    props: {
      modelValue
    },
    global: {
      plugins: [createAppI18n(locale)]
    }
  })
}

describe('MonthSelector', () => {
  it('renders the localized month label and navigation labels', () => {
    const wrapper = mountSelector(new Date(2026, 9, 24, 18, 0, 0))

    expect(wrapper.text()).toContain('październik 2026')
    expect(
      wrapper.find('button[aria-label="Poprzedni miesiąc"]').exists()
    ).toBe(true)
    expect(wrapper.find('button[aria-label="Następny miesiąc"]').exists()).toBe(
      true
    )
  })

  it('renders the month label in English', () => {
    const wrapper = mountSelector(new Date(2026, 9, 24, 18, 0, 0), 'en')

    expect(wrapper.text()).toContain('October 2026')
    expect(wrapper.find('button[aria-label="Previous month"]').exists()).toBe(
      true
    )
    expect(wrapper.find('button[aria-label="Next month"]').exists()).toBe(true)
  })

  it('emits the previous month as a normalized month-start date', async () => {
    const wrapper = mountSelector(new Date(2026, 9, 24, 18, 0, 0))

    await wrapper.get('button[aria-label="Poprzedni miesiąc"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [new Date(2026, 8, 1)]
    ])
  })

  it('emits the next month as a normalized month-start date', async () => {
    const wrapper = mountSelector(new Date(2026, 9, 24, 18, 0, 0))

    await wrapper.get('button[aria-label="Następny miesiąc"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [new Date(2026, 10, 1)]
    ])
  })
})
