import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppServicesProvides } from '@/ui/appServices.ts'
import MemberActiveDetailsDrawer from '@/ui/views/roster/components/MemberActiveDetailsDrawer.vue'
import { createAppI18n } from '@/ui/i18n.ts'

describe('MemberActiveDetailsDrawer', () => {
  const mockDeleteMemberHandle = vi.fn()
  const mockArchiveMemberHandle = vi.fn()
  const mockUpdateMemberHandle = vi.fn()
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
    mockDeleteMemberHandle.mockReset()
    mockArchiveMemberHandle.mockReset()
    mockUpdateMemberHandle.mockReset()
  })

  function mountDrawer(
    locale: 'pl' | 'en' = 'en',
    memberOverrides: Partial<typeof member> = {}
  ) {
    return mount(MemberActiveDetailsDrawer, {
      props: {
        isOpen: true,
        member: {
          ...member,
          ...memberOverrides
        }
      },
      global: {
        plugins: [createAppI18n(locale)],
        provide: createAppServicesProvides({
          queries: {} as never,
          system: {} as never,
          useCases: {
            archiveMember: { handle: mockArchiveMemberHandle },
            deleteMember: { handle: mockDeleteMemberHandle },
            updateMember: { handle: mockUpdateMemberHandle }
          } as never
        })
      }
    })
  }

  it('renders call and msg actions for saved phone numbers', () => {
    const wrapper = mountDrawer('en')

    const callAction = wrapper.get('a[href="tel:+48111111111"]')
    const msgAction = wrapper.get('a[href="sms:+48111111111"]')

    expect(wrapper.text()).toContain('+48 111 111 111')
    expect(callAction.text()).toBe('call')
    expect(msgAction.text()).toBe('msg')
  })

  it('localizes missing phone and joined date details in Polish', () => {
    const wrapper = mountDrawer('pl', {
      phoneNumber: undefined,
      joinedAt: undefined
    })

    const missingValueSpans = wrapper
      .findAll('span')
      .filter((span) => span.text() === 'Brak')

    expect(missingValueSpans).toHaveLength(2)
    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="sms:"]').exists()).toBe(false)
    expect(missingValueSpans[0]?.classes().sort()).toStrictEqual(
      missingValueSpans[1]?.classes().sort()
    )
  })

  it('opens the edit form and forwards saved member updates', async () => {
    mockUpdateMemberHandle.mockResolvedValue(undefined)

    const wrapper = mountDrawer('en')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit')
      ?.trigger('click')
    await wrapper.get('#member-edit-first-name-member-1').setValue('Amanda')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(mockUpdateMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1',
      firstName: 'Amanda',
      lastName: 'Silva',
      phoneNumber: '+48 111 111 111',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      joinedAt: new Date('2024-01-01T00:00:00.000Z')
    })
    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({
      id: 'member-1',
      firstName: 'amanda',
      lastName: 'silva'
    })
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('opens member delete confirmation from the trash action', async () => {
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-delete-open"]').trigger('click')

    expect(wrapper.text()).toContain('Delete member?')
    expect(wrapper.text()).toContain('Anderson Silva')
    expect(wrapper.get('[data-testid="member-delete-confirm"]').text()).toBe(
      'Delete'
    )
  })

  it('opens archive confirmation and archives through the application use case', async () => {
    mockArchiveMemberHandle.mockResolvedValue(undefined)
    const wrapper = mountDrawer('en')

    expect(
      wrapper
        .get('[data-testid="member-archive-open"]')
        .attributes('aria-label')
    ).toBe('Archive member Anderson Silva')
    expect(
      wrapper.get('[data-testid="member-archive-open"]').find('svg').exists()
    ).toBe(true)

    await wrapper.get('[data-testid="member-archive-open"]').trigger('click')

    expect(wrapper.text()).toContain('Archive member?')
    expect(wrapper.get('[data-testid="member-archive-confirm"]').text()).toBe(
      'Archive'
    )

    await wrapper.get('[data-testid="member-archive-confirm"]').trigger('click')
    await flushPromises()

    expect(mockArchiveMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1'
    })
    expect(wrapper.emitted('archived')?.[0]).toEqual(['member-1'])
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toBe('')
  })

  it('deletes a clean member through the application use case', async () => {
    mockDeleteMemberHandle.mockResolvedValue({
      membershipPaymentIds: [],
      attendanceListIds: [],
      deleted: true
    })
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-delete-open"]').trigger('click')
    await wrapper.get('[data-testid="member-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(mockDeleteMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1'
    })
    expect(wrapper.emitted('deleted')?.[0]).toEqual(['member-1'])
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toBe('')
  })

  it('emits a payment blocker error without deleting the member', async () => {
    mockDeleteMemberHandle.mockResolvedValue({
      membershipPaymentIds: ['payment-1'],
      attendanceListIds: ['attendance-1'],
      deleted: false
    })
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-delete-open"]').trigger('click')
    await wrapper.get('[data-testid="member-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toBe(
      'You cannot delete a member who has recorded payments.'
    )
  })

  it('keeps archive confirmation retryable when archiving fails', async () => {
    mockArchiveMemberHandle.mockRejectedValue(new Error('write failed'))
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-archive-open"]').trigger('click')
    await wrapper.get('[data-testid="member-archive-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('archived')).toBeUndefined()
    expect(wrapper.text()).toContain('Archive member?')
    expect(wrapper.text()).toContain('Try again. The member was not archived.')
    expect(
      wrapper.find('[data-testid="member-archive-confirm"]').exists()
    ).toBe(true)
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toBe('')
  })

  it('shows attendance blocker info without deleting the member', async () => {
    mockDeleteMemberHandle.mockResolvedValue({
      membershipPaymentIds: [],
      attendanceListIds: ['attendance-1', 'attendance-2'],
      deleted: false
    })
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-delete-open"]').trigger('click')
    await wrapper.get('[data-testid="member-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.text()).toContain('Remove from trainings first')
    expect(wrapper.text()).toContain('2 attendance lists')
    expect(wrapper.find('[data-testid="member-delete-cancel"]').exists()).toBe(
      false
    )

    await wrapper.get('[data-testid="member-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(mockDeleteMemberHandle).toHaveBeenCalledTimes(1)
  })

  it('keeps the delete confirmation retryable when deletion fails', async () => {
    mockDeleteMemberHandle.mockRejectedValue(new Error('write failed'))
    const wrapper = mountDrawer('en')

    await wrapper.get('[data-testid="member-delete-open"]').trigger('click')
    await wrapper.get('[data-testid="member-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(wrapper.text()).toContain('Delete member?')
    expect(wrapper.text()).toContain('Try again. The member was not deleted.')
    expect(wrapper.find('[data-testid="member-delete-confirm"]').exists()).toBe(
      true
    )
  })
})
