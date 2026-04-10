import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import MembersSortTool from '@/ui/components/MembersSortTool.vue'

describe('MembersSortTool', () => {
  function mountSortTool(
    props: {
      sortField: 'lastName' | 'firstName' | 'dateOfBirth' | 'joinedAt'
      sortDirection: 'asc' | 'desc'
    },
    locale: 'pl' | 'en' = 'pl'
  ) {
    return mount(MembersSortTool, {
      props,
      global: {
        plugins: [createAppI18n(locale)]
      }
    })
  }

  it('renders sort field labels from local English copy', () => {
    const wrapper = mountSortTool(
      {
        sortField: 'firstName',
        sortDirection: 'asc'
      },
      'en'
    )

    const optionLabels = wrapper
      .get('#members-sort-field')
      .findAll('option')
      .map((option) => option.text())

    expect(wrapper.text()).toContain('Sorting options')
    expect(optionLabels).toStrictEqual([
      'First name',
      'Last name',
      'Age',
      'Join date'
    ])
  })

  it('emits sort field and direction updates', async () => {
    const wrapper = mountSortTool({
      sortField: 'firstName',
      sortDirection: 'asc'
    })

    await wrapper.get('#members-sort-field').setValue('joinedAt')
    await wrapper.get('button[aria-label="Kierunek: Rosnąco"]').trigger('click')

    expect(wrapper.emitted('update:sortField')).toEqual([['joinedAt']])
    expect(wrapper.emitted('update:sortDirection')).toEqual([['desc']])
  })
})
