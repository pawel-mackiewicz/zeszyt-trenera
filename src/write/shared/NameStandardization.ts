const standardizableNamePattern = /^[\p{L}\s-]+$/u

export const isStandardizableName = (name: string): boolean =>
  name.trim().length > 0 && standardizableNamePattern.test(name)

export const standardizeName = (name: string): string =>
  name.trim().toLowerCase()
