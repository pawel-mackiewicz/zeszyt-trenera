import { describe, expect, it } from 'vitest'

import { LibPhoneNumberNormalizer } from '@/infra/phone/LibPhoneNumberNormalizer'

describe('LibPhoneNumberNormalizer', () => {
  const normalizer = new LibPhoneNumberNormalizer()

  it('normalizes valid international input to E.164', () => {
    expect(normalizer.normalizeInternational('+48 123 456 789')).toBe(
      '+48123456789'
    )
  })

  it('rejects input that does not carry an international calling code', () => {
    expect(normalizer.normalizeInternational('123456789')).toBeNull()
  })

  it('rejects invalid international-looking input', () => {
    expect(normalizer.normalizeInternational('+48 123')).toBeNull()
  })

  it('rejects pasted text that only contains a valid phone number', () => {
    expect(normalizer.normalizeInternational('Call +48 123 456 789')).toBeNull()
  })
})
