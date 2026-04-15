import { describe, expect, it } from 'vitest'

import { calculateAge, resolveAgeFromBirthDate } from '@/ui/utils/age'

describe('age utilities', () => {
  it('calculates age for a valid birth date', () => {
    const now = new Date('2026-04-09T12:00:00.000Z')
    const birthDate = new Date('2010-04-09T00:00:00.000Z')

    expect(calculateAge(birthDate, now)).toBe(16)
  })

  it('returns null when birth date is invalid', () => {
    const invalidBirthDate = new Date('invalid-date')

    expect(
      calculateAge(invalidBirthDate, new Date('2026-04-09T12:00:00.000Z'))
    ).toBeNull()
  })

  it('handles birthday boundary before and after the day in the same year', () => {
    // What: lock expected behavior around birthday transitions.
    // Why: age-range filtering and add-member age previews depend on this exact year rollover.
    const birthDate = new Date('2010-09-10T00:00:00.000Z')

    expect(calculateAge(birthDate, new Date('2026-09-09T12:00:00.000Z'))).toBe(
      15
    )
    expect(calculateAge(birthDate, new Date('2026-09-10T12:00:00.000Z'))).toBe(
      16
    )
  })

  it('keeps resolveAgeFromBirthDate defensive for out-of-range ages', () => {
    expect(
      resolveAgeFromBirthDate(
        new Date('1900-01-01T00:00:00.000Z'),
        new Date('2026-04-09T12:00:00.000Z')
      )
    ).toBeNull()
  })
})
