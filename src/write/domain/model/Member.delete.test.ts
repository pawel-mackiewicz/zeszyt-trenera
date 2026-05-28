import { describe, expect, it } from 'vitest'

import { Member } from '@/write/domain/model/Member'

describe('Member.delete', () => {
  it('emits a member.deleted event with the removed member snapshot', () => {
    const [member] = Member.register(
      {
        firstName: 'Jan',
        lastName: 'Kowalski',
        dateOfBirth: new Date('2000-01-01T00:00:00.000Z')
      },
      'member-1'
    )

    const event = Member.delete(member)

    expect(event.eventName).toBe('member.deleted')
    expect(event.payload).toEqual(member.toSnapshot())
  })
})
