import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'

type SortableMemberListItem = {
  age?: number
  dateOfBirth?: Date
  firstName: string
  joinedAt?: Date
  lastName: string
}

type SortMemberListItemsOptions = {
  direction: MemberSortDirection
  field: MemberSortField
  locale: string
}

function compareText(left: string, right: string, locale: string): number {
  return left.localeCompare(right, locale)
}

function compareOptionalNumbers(
  left: number | undefined,
  right: number | undefined,
  direction: MemberSortDirection
): number {
  if (left === undefined && right === undefined) {
    return 0
  }

  if (left === undefined) {
    return 1
  }

  if (right === undefined) {
    return -1
  }

  return (left - right) * (direction === 'asc' ? 1 : -1)
}

function toTime(value: Date | undefined): number | undefined {
  return value?.getTime()
}

function toAgeSortValue(member: SortableMemberListItem): number | undefined {
  if (member.age !== undefined) {
    return member.age
  }

  const birthTime = toTime(member.dateOfBirth)

  return birthTime === undefined ? undefined : -birthTime
}

function compareMembers(
  left: SortableMemberListItem,
  right: SortableMemberListItem,
  { direction, field, locale }: SortMemberListItemsOptions
): number {
  const directionMultiplier = direction === 'asc' ? 1 : -1

  if (field === 'firstName') {
    return (
      (compareText(left.firstName, right.firstName, locale) ||
        compareText(left.lastName, right.lastName, locale)) *
      directionMultiplier
    )
  }

  if (field === 'lastName') {
    return (
      (compareText(left.lastName, right.lastName, locale) ||
        compareText(left.firstName, right.firstName, locale)) *
      directionMultiplier
    )
  }

  if (field === 'dateOfBirth') {
    return (
      compareOptionalNumbers(
        toAgeSortValue(left),
        toAgeSortValue(right),
        direction
      ) ||
      (compareText(left.lastName, right.lastName, locale) ||
        compareText(left.firstName, right.firstName, locale)) *
        directionMultiplier
    )
  }

  return (
    compareOptionalNumbers(
      toTime(left.joinedAt),
      toTime(right.joinedAt),
      direction
    ) ||
    (compareText(left.lastName, right.lastName, locale) ||
      compareText(left.firstName, right.firstName, locale)) *
      directionMultiplier
  )
}

export function sortMemberListItems<T extends SortableMemberListItem>(
  members: readonly T[],
  options: SortMemberListItemsOptions
): T[] {
  return [...members].sort((left, right) =>
    compareMembers(left, right, options)
  )
}
