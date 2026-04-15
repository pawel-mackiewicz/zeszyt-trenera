import { calculateAge } from '@/ui/utils/age'

export const AGE_FILTER_MIN = 5
export const AGE_FILTER_MAX = 80

export type AgeRange = {
  min: number
  max: number
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
