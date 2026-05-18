import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppButton from '@/ui/components/AppButton.vue'

describe('AppButton', () => {
  function mountButton(
    props: Record<string, unknown> = {},
    slots: Record<string, string> = {
      default: 'Akcja'
    }
  ) {
    return mount(AppButton, {
      props,
      slots,
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to" :to="to" v-bind="$attrs"><slot /></a>'
          }
        }
      }
    })
  }

  it('renders the shared primary button recipe by default', () => {
    const wrapper = mountButton()

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.classes()).toContain('app-button')
    expect(wrapper.classes()).toContain('app-button--primary')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('renders the shared secondary router-link variant when requested', () => {
    const wrapper = mountButton({
      as: 'router-link',
      to: '/attendance/new',
      variant: 'secondary'
    })

    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('to')).toBe('/attendance/new')
    expect(wrapper.classes()).toContain('app-button--secondary')
  })

  it('renders the icon-only modifier for compact CTA triggers', () => {
    const wrapper = mountButton(
      {
        iconOnly: true
      },
      {
        default: '<span aria-hidden="true">+</span>'
      }
    )

    expect(wrapper.classes()).toContain('app-button--icon-only')
  })

  it('renders the compact size modifier for shell-level actions', () => {
    const wrapper = mountButton({
      size: 'compact'
    })

    expect(wrapper.classes()).toContain('app-button--compact')
  })

  it('keeps compact icon-only triggers on the same shared primitive', () => {
    const wrapper = mountButton(
      {
        iconOnly: true,
        size: 'compact'
      },
      {
        default: '<span aria-hidden="true">+</span>'
      }
    )

    expect(wrapper.classes()).toContain('app-button--compact')
    expect(wrapper.classes()).toContain('app-button--icon-only')
  })

  it('prevents disabled router-link clicks from emitting navigation events', async () => {
    const wrapper = mountButton({
      as: 'router-link',
      disabled: true,
      to: '/attendance/new'
    })

    await wrapper.trigger('click')

    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
