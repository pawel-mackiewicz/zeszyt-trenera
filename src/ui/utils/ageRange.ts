export const AGE_FILTER_MIN = 5
export const AGE_FILTER_MAX = 80

export type AgeRange = {
  min: number
  max: number
}

export function calculateAge(value: Date | string | undefined): number | null {
  if (!value) {
    return null
  }

  const birthDate = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(birthDate.getTime())) {
    return null
  }

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }

  return age
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

export function isDefaultAgeRange(
  minValue: number,
  maxValue: number,
  minBound = AGE_FILTER_MIN,
  maxBound = AGE_FILTER_MAX
): boolean {
  const range = normalizeAgeRange(minValue, maxValue)

  return range.min === minBound && range.max === maxBound
}

export function matchesAgeRange(
  value: Date | string | undefined,
  minValue: number,
  maxValue: number,
  minBound = AGE_FILTER_MIN,
  maxBound = AGE_FILTER_MAX
): boolean {
  const age = calculateAge(value)

  if (age === null) {
    // What: keep members with unknown ages visible only at the untouched full range. Why: a narrowed age band must stay truthful, but the default roster should not hide people just because their birth date is missing locally.
    return isDefaultAgeRange(minValue, maxValue, minBound, maxBound)
  }

  const range = normalizeAgeRange(minValue, maxValue)

  return age >= range.min && age <= range.max
}
