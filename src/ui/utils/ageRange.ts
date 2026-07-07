import { calculateAge } from '@/ui/utils/age'

export const AGE_FILTER_MIN = 5
export const AGE_FILTER_MAX = 80

export type AgeRange = {
  min: number
  max: number
}

export function getAgeRangeBoundsFromAges(
  ages: Iterable<number | null | undefined>
): AgeRange {
  const validAges = [...ages].filter(
    (age): age is number => typeof age === 'number' && Number.isFinite(age)
  )

  if (validAges.length === 0) {
    return {
      min: AGE_FILTER_MIN,
      max: AGE_FILTER_MAX
    }
  }

  return {
    min: Math.min(...validAges),
    max: Math.max(...validAges)
  }
}

export function getAgeRangeBoundsFromBirthDates(
  birthDates: Iterable<Date | null | undefined>,
  now = new Date()
): AgeRange {
  return getAgeRangeBoundsFromAges(
    [...birthDates].map((birthDate) =>
      birthDate instanceof Date ? calculateAge(birthDate, now) : null
    )
  )
}

export function clampAgeRangeToBounds(
  minValue: number,
  maxValue: number,
  bounds: AgeRange
): AgeRange {
  const normalizedBounds = normalizeAgeRange(bounds.min, bounds.max)

  return {
    min: clampAgeValue(minValue, normalizedBounds),
    max: clampAgeValue(maxValue, normalizedBounds)
  }
}

export function ageRangeCoversBounds(
  minValue: number,
  maxValue: number,
  bounds: AgeRange
): boolean {
  const range = normalizeAgeRange(minValue, maxValue)
  const normalizedBounds = normalizeAgeRange(bounds.min, bounds.max)

  return range.min <= normalizedBounds.min && range.max >= normalizedBounds.max
}

export function normalizeAgeRange(
  minValue: number,
  maxValue: number
): AgeRange {
  return {
    min: Math.min(minValue, maxValue),
    max: Math.max(minValue, maxValue)
  }
}

export function matchesAgeRange(
  value: Date,
  minValue: number,
  maxValue: number
): boolean {
  return matchesAgeValueRange(calculateAge(value), minValue, maxValue)
}

export function matchesAgeValueRange(
  age: number | null,
  minValue: number,
  maxValue: number
): boolean {
  if (age === null || Number.isNaN(age)) {
    // What: reject rows with invalid derived age values during filtering. Why: birth date is now mandatory, so age-range filters should only operate on valid numeric ages.
    return false
  }

  const range = normalizeAgeRange(minValue, maxValue)

  return age >= range.min && age <= range.max
}

function clampAgeValue(value: number, bounds: AgeRange): number {
  if (!Number.isFinite(value)) {
    return bounds.min
  }

  return Math.min(bounds.max, Math.max(bounds.min, value))
}
