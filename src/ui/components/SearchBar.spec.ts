import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SearchBar from '@/ui/components/SearchBar.vue'

describe('SearchBar', () => {
  it('renders the compact accessible search field from the shared props', () => {
    const wrapper = mount(SearchBar, {
      props: {
        modelValue: 'Royce',
        inputId: 'members-search',
        placeholder: 'Enter first and last name',
        inputLabel: 'Search the register'
      }
    })

    const input = wrapper.get('#members-search')

    expect(input.element).toHaveProperty('value', 'Royce')
    expect(input.attributes('placeholder')).toBe('Enter first and last name')
    expect(input.attributes('aria-label')).toBe('Search the register')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('emits model updates when the query changes', async () => {
    const wrapper = mount(SearchBar, {
      props: {
        modelValue: '',
        inputId: 'attendance-search',
        placeholder: 'Enter first and last name',
        inputLabel: 'Search attendance members'
      }
    })

    await wrapper.get('#attendance-search').setValue('Anderson')

    expect(wrapper.emitted('update:modelValue')).toEqual([['Anderson']])
  })
})
