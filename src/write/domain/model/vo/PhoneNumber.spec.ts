import { describe, expect, it } from 'vitest'

import {
  InvalidPhoneNumberError,
  PhoneNumber
} from '@/write/domain/model/vo/PhoneNumber'

describe('PhoneNumber', () => {
  it('normalizes valid international input to E.164', () => {
    const phoneNumber = PhoneNumber.create('+48 123 456 789')

    expect(phoneNumber.value).toBe('+48123456789')
    expect(phoneNumber.toString()).toBe('+48123456789')
  })

  it('rejects input that does not carry an international calling code', () => {
    expect(() => PhoneNumber.create('123456789')).toThrow(
      InvalidPhoneNumberError
    )
  })

  it('rejects invalid international-looking input', () => {
    expect(() => PhoneNumber.create('+48 123')).toThrow(InvalidPhoneNumberError)
  })

  it('rejects pasted text that only contains a valid phone number', () => {
    expect(() => PhoneNumber.create('Call +48 123 456 789')).toThrow(
      InvalidPhoneNumberError
    )
  })
})
