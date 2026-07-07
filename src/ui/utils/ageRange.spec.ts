import { describe, expect, it } from 'vitest'

import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  ageRangeCoversBounds,
  clampAgeRangeToBounds,
  getAgeRangeBoundsFromAges,
  getAgeRangeBoundsFromBirthDates
} from '@/ui/utils/ageRange'

describe('ageRange', () => {
  it('uses the youngest and oldest numeric ages from the current data', () => {
    expect(
      getAgeRangeBoundsFromAges([18, null, Number.NaN, 36, undefined, 8])
    ).toEqual({
      min: 8,
      max: 36
    })
  })

  it('derives age bounds from birth dates with the supplied clock', () => {
    const now = new Date('2026-07-07T12:00:00Z')

    expect(
      getAgeRangeBoundsFromBirthDates(
        [new Date('2010-01-01T00:00:00Z'), new Date('2015-12-31T00:00:00Z')],
        now
      )
    ).toEqual({
      min: 10,
      max: 16
    })
  })

  it('falls back to the static age scale when no valid ages exist yet', () => {
    expect(getAgeRangeBoundsFromAges([null, Number.NaN, undefined])).toEqual({
      min: AGE_FILTER_MIN,
      max: AGE_FILTER_MAX
    })
  })

  it('clamps selected age handles to the current data bounds', () => {
    expect(
      clampAgeRangeToBounds(3, 90, {
        min: 10,
        max: 60
      })
    ).toEqual({
      min: 10,
      max: 60
    })
  })

  it('recognizes when the selected range still covers all current data ages', () => {
    expect(
      ageRangeCoversBounds(AGE_FILTER_MIN, AGE_FILTER_MAX, { min: 9, max: 56 })
    ).toBe(true)
    expect(ageRangeCoversBounds(20, 56, { min: 9, max: 56 })).toBe(false)
  })
})
