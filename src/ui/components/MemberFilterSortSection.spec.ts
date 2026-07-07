import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import MemberFilterSortSection from '@/ui/components/MemberFilterSortSection.vue'

describe('MemberFilterSortSection', () => {
  function mountSection(
    props: Partial<InstanceType<typeof MemberFilterSortSection>['$props']> = {}
  ) {
    return mount(MemberFilterSortSection, {
      props: {
        maxAgeBound: 80,
        maxAgeFilter: 80,
        minAgeBound: 10,
        memberSortDirection: 'asc',
        memberSortField: 'firstName',
        minAgeFilter: 10,
        searchInputId: 'member-filter-search',
        searchLabel: 'Search members',
        searchPlaceholder: 'Type a name',
        searchQuery: '',
        ...props
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

  it('uses the current data ages as the range control bounds', () => {
    const wrapper = mountSection({
      maxAgeBound: 64,
      maxAgeFilter: 64,
      minAgeBound: 12,
      minAgeFilter: 12
    })

    expect(
      wrapper
        .findAll('input[type="range"]')
        .map((input) => input.attributes('min'))
    ).toEqual(['12', '12'])
    expect(
      wrapper
        .findAll('input[type="range"]')
        .map((input) => input.attributes('max'))
    ).toEqual(['64', '64'])
  })

  it('moves selected age filters back inside the current data bounds', () => {
    const wrapper = mountSection({
      maxAgeBound: 64,
      maxAgeFilter: 80,
      minAgeBound: 12,
      minAgeFilter: 5
    })

    expect(wrapper.emitted('update:minAgeFilter')).toStrictEqual([[12]])
    expect(wrapper.emitted('update:maxAgeFilter')).toStrictEqual([[64]])
  })

  it('lets the coach choose ages between member ages inside the data range', async () => {
    const wrapper = mountSection({
      maxAgeBound: 50,
      maxAgeFilter: 50,
      minAgeBound: 7,
      minAgeFilter: 7
    })

    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0]?.setValue('30')

    expect(wrapper.emitted('update:minAgeFilter')).toStrictEqual([[30]])
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
