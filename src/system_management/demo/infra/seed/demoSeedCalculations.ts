import { MONTH_SESSION_TEMPLATE } from '@/system_management/demo/infra/seed/demoSeedData.ts'

export function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

export function resolveCurrentMonthSessions(
  monthStart: Date,
  now: Date
): Date[] {
  const pastTemplateSessions = createMonthSessions(monthStart).filter(
    (sessionStart) => sessionStart.getTime() <= now.getTime()
  )

  if (pastTemplateSessions.length > 0) {
    return pastTemplateSessions
  }

  const fallbackSession = new Date(now)

  fallbackSession.setMinutes(fallbackSession.getMinutes() - 15)

  return [
    snapDateToQuarterHourGrid(
      fallbackSession.getTime() < monthStart.getTime()
        ? monthStart
        : fallbackSession
    )
  ]
}

export function createMonthSessions(monthStart: Date): Date[] {
  return MONTH_SESSION_TEMPLATE.map((templateEntry) =>
    snapDateToQuarterHourGrid(
      new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        templateEntry.day,
        templateEntry.hours,
        templateEntry.minutes
      )
    )
  )
}

export function createSeededRng(seedValue: string) {
  return mulberry32(hashString(seedValue))
}

export function shuffle<T>(values: T[], rng: () => number): T[] {
  const copy = [...values]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1))
    const currentValue = copy[index]

    copy[index] = copy[randomIndex] as T
    copy[randomIndex] = currentValue as T
  }

  return copy
}

export function formatPolishMonthLabel(value: Date): string {
  return capitalizeNamePart(
    new Intl.DateTimeFormat('pl-PL', {
      month: 'long',
      year: 'numeric'
    }).format(value)
  )
}

function snapDateToQuarterHourGrid(value: Date): Date {
  const snappedValue = new Date(value)
  const roundedMinutes = Math.round(snappedValue.getMinutes() / 15) * 15

  snappedValue.setSeconds(0, 0)
  snappedValue.setMinutes(roundedMinutes)

  return snappedValue
}

function capitalizeNamePart(value: string): string {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return trimmedValue
  }

  return `${trimmedValue.charAt(0).toLocaleUpperCase()}${trimmedValue.slice(1)}`
}

function hashString(value: string): number {
  let hash = 1779033703 ^ value.length

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  return hash >>> 0
}

function mulberry32(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let result = Math.imul(state ^ (state >>> 15), 1 | state)

    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}
