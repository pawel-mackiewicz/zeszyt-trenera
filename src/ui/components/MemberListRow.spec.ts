import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import MemberListRow from '@/ui/components/MemberListRow.vue'

describe('MemberListRow', () => {
  function mountRow(
    props: Partial<InstanceType<typeof MemberListRow>['$props']> = {},
    slots: Record<string, string> = {}
  ) {
    return mount(MemberListRow, {
      props: {
        ageLabel: 'Age 36',
        name: 'Amanda Nunes',
        statusIcon: 'add',
        ...props
      },
      slots
    })
  }

  it('shows the member a coach is choosing with the age under the name', () => {
    const wrapper = mountRow()

    expect(wrapper.text()).toContain('Amanda Nunes')
    expect(wrapper.text()).toContain('Age 36')
    expect(wrapper.classes()).toContain('member-list-row')
  })

  it('marks a selected member with the shared selected row state', () => {
    const wrapper = mountRow({
      selected: true,
      statusIcon: 'check_circle'
    })

    expect(wrapper.classes()).toContain('member-list-row--selected')
    expect(wrapper.find('.member-list-row__status').classes()).toContain(
      'member-list-row__status--selected'
    )
  })

  it('keeps an unavailable member visible with supporting text', async () => {
    const onClick = vi.fn()
    const wrapper = mount(MemberListRow, {
      attrs: {
        onClick
      },
      props: {
        ageLabel: 'Age 59',
        disabled: true,
        muted: true,
        name: 'Royce Gracie',
        statusIcon: 'check_circle'
      },
      slots: {
        supporting: 'Already signed'
      }
    })

    await wrapper.trigger('click')

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('member-list-row--muted')
    expect(wrapper.text()).toContain('Already signed')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('can render as a summary row with an open status icon', () => {
    const wrapper = mountRow({
      as: 'summary',
      statusIcon: 'expand_more',
      statusOpen: true
    })

    expect(wrapper.element.tagName).toBe('SUMMARY')
    expect(wrapper.find('.member-list-row__status').classes()).toContain(
      'member-list-row__status--open'
    )
  })
})
