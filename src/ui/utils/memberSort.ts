import type { PersistedMember } from '@/infra'

export type MemberSortField =
  | 'lastName'
  | 'firstName'
  | 'dateOfBirth'
  | 'joinedAt'
export type MemberSortDirection = 'asc' | 'desc'

type SortableDate = Date | string | undefined

function compareText(
  left: string,
  right: string,
  locale: string,
  direction: MemberSortDirection = 'asc'
): number {
  const comparison = left.localeCompare(right, locale)

  return direction === 'asc' ? comparison : comparison * -1
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: MemberSortDirection
): number {
  if (left === null && right === null) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  return direction === 'asc' ? left - right : right - left
}

function toSortableTimestamp(value: SortableDate): number | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

function compareNullableDate(
  left: SortableDate,
  right: SortableDate,
  direction: MemberSortDirection
): number {
  return compareNullableNumber(
    toSortableTimestamp(left),
    toSortableTimestamp(right),
    direction
  )
}

function compareMemberIdentity(
  left: PersistedMember,
  right: PersistedMember,
  locale: string
): number {
  return (
    compareText(left.lastName, right.lastName, locale) ||
    compareText(left.firstName, right.firstName, locale) ||
    compareText(left.id, right.id, locale)
  )
}

export function sortMembers(
  members: PersistedMember[],
  options: {
    field: MemberSortField
    direction: MemberSortDirection
    locale: string
  }
): PersistedMember[] {
  // What: keep member ordering decisions in one pure utility instead of a single screen. Why: mobile-first roster views need identical sorting for names and dates wherever the shared sort tool is reused.
  const { field, direction, locale } = options

  return [...members].sort((left, right) => {
    switch (field) {
      case 'lastName':
        return (
          compareText(left.lastName, right.lastName, locale, direction) ||
          compareText(left.firstName, right.firstName, locale) ||
          compareText(left.id, right.id, locale)
        )
      case 'dateOfBirth':
        // What: keep one canonical birth-date sort path instead of a separate age branch. Why: duplicate age/date-of-birth comparators drift over time and create inconsistent ordering in local-first lists.
        return (
          compareNullableDate(left.dateOfBirth, right.dateOfBirth, direction) ||
          compareMemberIdentity(left, right, locale)
        )
      case 'joinedAt':
        return (
          compareNullableDate(left.joinedAt, right.joinedAt, direction) ||
          compareMemberIdentity(left, right, locale)
        )
      case 'firstName':
      default:
        return (
          compareText(left.firstName, right.firstName, locale, direction) ||
          compareText(left.lastName, right.lastName, locale) ||
          compareText(left.id, right.id, locale)
        )
    }
  })
}
