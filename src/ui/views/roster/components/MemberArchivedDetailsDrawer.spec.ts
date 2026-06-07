import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppServicesProvides } from '@/ui/appServices.ts'
import MemberArchivedDetailsDrawer from './MemberArchivedDetailsDrawer.vue'
import { createAppI18n } from '@/ui/i18n.ts'

describe('MemberArchivedDetailsDrawer', () => {
  const mockUnarchiveMemberHandle = vi.fn()
  const member = {
    id: 'member-1',
    firstName: 'Anderson',
    lastName: 'Silva',
    phoneNumber: '+48 111 111 111',
    dateOfBirth: new Date('1990-01-01T00:00:00Z'),
    joinedAt: new Date('2024-01-01T00:00:00Z'),
    createdAt: new Date('2026-03-20T10:00:00Z')
  }

  beforeEach(() => {
    mockUnarchiveMemberHandle.mockReset()
  })

  function mountDrawer(locale: 'pl' | 'en' = 'en') {
    return mount(MemberArchivedDetailsDrawer, {
      props: {
        isOpen: true,
        member
      },
      global: {
        plugins: [createAppI18n(locale)],
        provide: createAppServicesProvides({
          queries: {} as never,
          system: {} as never,
          useCases: {
            unarchiveMember: { handle: mockUnarchiveMemberHandle }
          } as never
        })
      }
    })
  }

  it('renders archived details with only the unarchive button', () => {
    const wrapper = mountDrawer('en')

    expect(wrapper.get('a[href="tel:+48111111111"]').text()).toBe('call')
    expect(wrapper.get('a[href="sms:+48111111111"]').text()).toBe('msg')
    const unarchiveButton = wrapper.get('[data-testid="member-unarchive"]')
    expect(unarchiveButton.text()).toBe('')
    expect(unarchiveButton.attributes('aria-label')).toBe(
      'Unarchive member Anderson Silva'
    )
    expect(unarchiveButton.attributes('title')).toBe(
      'Unarchive member Anderson Silva'
    )
    expect(unarchiveButton.find('svg').exists()).toBe(true)
  })

  it('restores archived members through the application use case', async () => {
    mockUnarchiveMemberHandle.mockResolvedValue(undefined)
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-unarchive"]').trigger('click')
    await flushPromises()

    expect(mockUnarchiveMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1'
    })
    expect(wrapper.emitted('unarchived')?.[0]).toEqual(['member-1'])
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toBe('')
  })

  it('reports restore failures without emitting unarchived', async () => {
    mockUnarchiveMemberHandle.mockRejectedValue(new Error('write failed'))
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-unarchive"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('unarchived')).toBeUndefined()
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toBe(
      'The member could not be unarchived. Try again.'
    )
  })
})
