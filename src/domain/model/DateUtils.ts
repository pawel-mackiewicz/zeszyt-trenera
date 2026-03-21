// Domain dates stay behind defensive copies because Date mutators would otherwise let callers rewrite aggregate history.
export const copyDate = (value: Date): Date => new Date(value.getTime())

export const copyOptionalDate = (value?: Date): Date | undefined =>
  value === undefined ? undefined : copyDate(value)
