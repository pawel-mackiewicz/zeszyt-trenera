import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvalidPhoneNumberError } from '@/write/shared/vo/PhoneNumber'
import { createAppServicesProvides } from '@/ui/appServices.ts'
import MemberEditDrawer from '@/ui/views/roster/components/MemberEditDrawer.vue'
import { createAppI18n } from '@/ui/i18n.ts'

describe('MemberEditDrawer', () => {
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
    mockUpdateMemberHandle.mockReset()
  })

  function mountDrawer(locale: 'pl' | 'en' = 'en') {
    return mount(MemberEditDrawer, {
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
            updateMember: { handle: mockUpdateMemberHandle }
          } as never
        })
      }
    })
  }

  it('submits member updates through the application layer use case', async () => {
    mockUpdateMemberHandle.mockResolvedValue(undefined)

    const wrapper = mountDrawer('en')

    await wrapper.get('#member-edit-first-name-member-1').setValue('Amanda')
    await wrapper
      .get('#member-edit-phone-number-member-1')
      .setValue('+48 999 888 777')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(mockUpdateMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1',
      firstName: 'Amanda',
      lastName: 'Silva',
      phoneNumber: '+48 999 888 777',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      joinedAt: new Date('2024-01-01T00:00:00.000Z')
    })
    expect(wrapper.emitted('saved')?.[0]).toStrictEqual([
      {
        ...member,
        firstName: 'amanda',
        lastName: 'silva',
        phoneNumber: '+48 999 888 777',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        joinedAt: new Date('2024-01-01T00:00:00.000Z')
      }
    ])
  })

  it('keeps edit labels plain while letting the edit form clear phone', async () => {
    mockUpdateMemberHandle.mockResolvedValue(undefined)

    const wrapper = mountDrawer('en')

    const labelTexts = wrapper
      .findAll('label')
      .map((label) => label.text().replace(/\s+/g, ' ').trim())

    expect(labelTexts).toStrictEqual([
      'First name',
      'Last name',
      'Phone',
      'Birth date',
      'Joined'
    ])

    const textInputs = wrapper.findAll('input[type="text"]')
    expect(textInputs[0]?.attributes('required')).toBe('')
    expect(textInputs[1]?.attributes('required')).toBe('')
    expect(
      wrapper.get('input[type="tel"]').attributes('required')
    ).toBeUndefined()
    expect(wrapper.get('input[type="date"]').attributes('required')).toBe('')

    await wrapper.get('input[type="tel"]').setValue('')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(mockUpdateMemberHandle).toHaveBeenCalledWith({
      memberId: 'member-1',
      firstName: 'Anderson',
      lastName: 'Silva',
      phoneNumber: '',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      joinedAt: new Date('2024-01-01T00:00:00.000Z')
    })
    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({
      phoneNumber: undefined
    })
  })

  it('emits localized edit errors from domain failures', async () => {
    mockUpdateMemberHandle.mockRejectedValue(
      new InvalidPhoneNumberError('invalid')
    )

    const wrapper = mountDrawer('pl')

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.emitted('error')?.at(-1)).toStrictEqual([
      'Podaj poprawny numer telefonu.'
    ])
  })

  it('emits cancel when the coach closes the drawer', async () => {
    const wrapper = mountDrawer('en')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click')

    expect(wrapper.emitted('error')?.at(-1)).toStrictEqual([''])
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
