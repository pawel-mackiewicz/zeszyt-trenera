import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import MemberFilterSortSection from '@/ui/components/MemberFilterSortSection.vue'

describe('MemberFilterSortSection', () => {
  function mountSection() {
    return mount(MemberFilterSortSection, {
      props: {
        maxAgeFilter: 80,
        memberSortDirection: 'asc',
        memberSortField: 'firstName',
        minAgeFilter: 10,
        searchInputId: 'member-filter-search',
        searchLabel: 'Search members',
        searchPlaceholder: 'Type a name',
        searchQuery: ''
      },
      global: {
        plugins: [createAppI18n('en')]
      }
    })
  }

  it('renders the unified search, sort, and age controls', () => {
    const wrapper = mountSection()

    expect(wrapper.get('#member-filter-search').attributes('placeholder')).toBe(
      'Type a name'
    )
    expect(wrapper.find('#members-sort-field').exists()).toBe(true)
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(2)
  })

  it('emits updates from every control group', async () => {
    const wrapper = mountSection()

    await wrapper.get('#member-filter-search').setValue('ada')
    await wrapper.get('#members-sort-field').setValue('lastName')
    await wrapper
      .get('button[aria-label="Direction: Ascending"]')
      .trigger('click')

    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0]?.setValue('20')
    await sliders[1]?.setValue('60')

    expect(wrapper.emitted('update:searchQuery')).toStrictEqual([['ada']])
    expect(wrapper.emitted('update:memberSortField')).toStrictEqual([
      ['lastName']
    ])
    expect(wrapper.emitted('update:memberSortDirection')).toStrictEqual([
      ['desc']
    ])
    expect(wrapper.emitted('update:minAgeFilter')).toStrictEqual([[20]])
    expect(wrapper.emitted('update:maxAgeFilter')).toStrictEqual([[60]])
  })
})
