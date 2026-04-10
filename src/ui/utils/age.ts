// What: centralize shared age derivation and age-entry conversion helpers in one place. Why: these rules are reused by multiple views and utilities and are not specific to age-range filtering.
export const AGE_ENTRY_MIN = 1
export const AGE_ENTRY_MAX = 120

export function calculateAge(
  value: Date | string | undefined,
  now = new Date()
): number | null {
  if (!value) {
    return null
  }

  const birthDate = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(birthDate.getTime())) {
    return null
  }

  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDelta = now.getMonth() - birthDate.getMonth()

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }

  return age
}

export function birthDateInputValueFromAge(
  age: number,
  now = new Date()
): string | null {
  if (!Number.isInteger(age) || age < AGE_ENTRY_MIN || age > AGE_ENTRY_MAX) {
    return null
  }

  // What: translate age-only entry into one canonical date string. Why: the add-member form can offer a faster mobile picker without changing the application layer contract that still persists a birth date.
  return `${now.getFullYear() - age}-01-01`
}

export function resolveAgeFromBirthDate(
  value: Date | string | undefined,
  now = new Date()
): number | null {
  const age = calculateAge(value, now)

  if (age === null || age < AGE_ENTRY_MIN || age > AGE_ENTRY_MAX) {
    return null
  }

  return age
}
