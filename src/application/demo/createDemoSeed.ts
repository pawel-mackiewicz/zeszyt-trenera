import { toMembershipPaymentCoveredMonth } from '@/domain/model/MembershipPayment'

//todo: move to infra probably

type DemoName = {
  firstName: string
  lastName: string
}

export type DemoMemberSeed = DemoName & {
  dateOfBirth: Date
  joinedAt: Date
  phoneNumber: string
}

export type DemoMembershipPaymentSeed = {
  coveredMonth: string
  memberIndex: number
}

export type DemoAttendanceListSeed = {
  memberIndexes: number[]
  start: Date
}

export type DemoSeed = {
  club: {
    name: string
    foundingDate: Date
  }
  trainer: {
    name: string
  }
  members: DemoMemberSeed[]
  membershipPayments: DemoMembershipPaymentSeed[]
  attendanceLists: DemoAttendanceListSeed[]
  summary: {
    currentCoveredMonth: string
    previousCoveredMonth: string
    currentMonthSessionCount: number
    previousMonthSessionCount: number
    currentPaidMemberIndexes: number[]
    currentUnpaidAbsentMemberIndexes: number[]
    currentUnpaidAttendedMemberIndexes: number[]
    previousPaidMemberIndexes: number[]
    previousUnpaidAbsentMemberIndexes: number[]
    previousUnpaidAttendedMemberIndexes: number[]
  }
}

const DEMO_MEMBER_NAMES: DemoName[] = [
  { firstName: 'Royce', lastName: 'Gracie' },
  { firstName: 'Rickson', lastName: 'Gracie' },
  { firstName: 'Roger', lastName: 'Gracie' },
  { firstName: 'Marcelo', lastName: 'Garcia' },
  { firstName: 'Gordon', lastName: 'Ryan' },
  { firstName: 'Andre', lastName: 'Galvao' },
  { firstName: 'Marcus', lastName: 'Almeida' },
  { firstName: 'Romulo', lastName: 'Barral' },
  { firstName: 'Rafael', lastName: 'Mendes' },
  { firstName: 'Guilherme', lastName: 'Mendes' },
  { firstName: 'Rubens', lastName: 'Cobrinha' },
  { firstName: 'Rodolfo', lastName: 'Vieira' },
  { firstName: 'Bernardo', lastName: 'Faria' },
  { firstName: 'Leandro', lastName: 'Lo' },
  { firstName: 'Tainan', lastName: 'Dalpra' },
  { firstName: 'Mica', lastName: 'Galvao' },
  { firstName: 'Demian', lastName: 'Maia' },
  { firstName: 'Charles', lastName: 'Oliveira' },
  { firstName: 'Anderson', lastName: 'Silva' },
  { firstName: 'Jose', lastName: 'Aldo' },
  { firstName: 'Amanda', lastName: 'Nunes' },
  { firstName: 'Valentina', lastName: 'Shevchenko' },
  { firstName: 'Zhang', lastName: 'Weili' },
  { firstName: 'Joanna', lastName: 'Jedrzejczyk' },
  { firstName: 'Islam', lastName: 'Makhachev' },
  { firstName: 'Khabib', lastName: 'Nurmagomedov' },
  { firstName: 'Jon', lastName: 'Jones' },
  { firstName: 'Georges', lastName: 'St-Pierre' },
  { firstName: 'Daniel', lastName: 'Cormier' },
  { firstName: 'Kamaru', lastName: 'Usman' },
  { firstName: 'Israel', lastName: 'Adesanya' },
  { firstName: 'Alexander', lastName: 'Volkanovski' },
  { firstName: 'Max', lastName: 'Holloway' },
  { firstName: 'Conor', lastName: 'McGregor' },
  { firstName: 'Dustin', lastName: 'Poirier' },
  { firstName: 'Nate', lastName: 'Diaz' },
  { firstName: 'Nick', lastName: 'Diaz' },
  { firstName: 'Frankie', lastName: 'Edgar' },
  { firstName: 'Ronda', lastName: 'Rousey' },
  { firstName: 'Holly', lastName: 'Holm' },
  { firstName: 'Cris', lastName: 'Cyborg' },
  { firstName: 'Fedor', lastName: 'Emelianenko' },
  { firstName: 'Mirko', lastName: 'Filipovic' },
  { firstName: 'Fabricio', lastName: 'Werdum' },
  { firstName: 'Antonio', lastName: 'Nogueira' },
  { firstName: 'Junior', lastName: 'Dos Santos' },
  { firstName: 'Cain', lastName: 'Velasquez' },
  { firstName: 'Lyoto', lastName: 'Machida' },
  { firstName: 'Bj', lastName: 'Penn' },
  { firstName: 'Henry', lastName: 'Cejudo' },
  // Why: make demo rosters feel closer to the app's Polish audience during onboarding, screenshots, and local demos.
  { firstName: 'Mamed', lastName: 'Khalidov' },
  { firstName: 'Mariusz', lastName: 'Pudzianowski' },
  { firstName: 'Janek', lastName: 'Błachowicz' },
  { firstName: 'Mateusz', lastName: 'Gamrot' },
  { firstName: 'Karolina', lastName: 'Kowalkiewicz' },
  { firstName: 'Damian', lastName: 'Janikowski' },
  { firstName: 'Michał', lastName: 'Materla' },
  { firstName: 'Łukasz', lastName: 'Jurkowski' },
  { firstName: 'Artur', lastName: 'Szpilka' },
  { firstName: 'Tomasz', lastName: 'Adamek' }
]

const DEMO_MEMBER_AGES = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60,
  61, 62, 63, 64, 65, 67, 69, 71, 73, 75, 19, 31, 33, 35, 37, 39, 41, 43, 45, 47
] as const

const MONTH_SESSION_TEMPLATE = [
  { day: 1, hours: 8, minutes: 0 },
  { day: 1, hours: 12, minutes: 0 },
  { day: 2, hours: 18, minutes: 0 },
  { day: 4, hours: 18, minutes: 0 },
  { day: 6, hours: 18, minutes: 0 },
  { day: 8, hours: 18, minutes: 0 },
  { day: 10, hours: 18, minutes: 0 },
  { day: 12, hours: 18, minutes: 0 },
  { day: 14, hours: 18, minutes: 0 },
  { day: 17, hours: 18, minutes: 0 },
  { day: 19, hours: 18, minutes: 0 },
  { day: 21, hours: 18, minutes: 0 },
  { day: 24, hours: 18, minutes: 0 },
  { day: 26, hours: 18, minutes: 0 },
  { day: 28, hours: 18, minutes: 0 }
] as const

const DEMO_UNPAID_ABSENT_MEMBER_COUNT = 5
const DEMO_PREVIOUS_MONTH_UNPAID_ABSENT_MEMBER_COUNT = 4
const MAX_UNPAID_ATTENDED_MEMBER_COUNT = 3
const MAX_PREVIOUS_MONTH_UNPAID_ATTENDED_MEMBER_COUNT = 2
const MIN_CURRENT_SESSION_SIZE = 6
const MIN_PREVIOUS_SESSION_SIZE = 8

/**
 * Builds one deterministic demo dataset from runtime time.
 *
 * Why: demo mode has to stay believable over time without carrying stale hard-coded months that would make a local-first notebook look broken next year.
 */
export function createDemoSeed(now: Date): DemoSeed {
  const currentMonthStart = startOfMonth(now)
  const previousMonthStart = addMonths(currentMonthStart, -1)
  const currentCoveredMonth = toMembershipPaymentCoveredMonth(currentMonthStart)
  const previousCoveredMonth =
    toMembershipPaymentCoveredMonth(previousMonthStart)
  const currentSessions = resolveCurrentMonthSessions(currentMonthStart, now)
  const previousSessions = createMonthSessions(previousMonthStart)
  const members = createDemoMembers(now)
  const memberIndexes = members.map((_, index) => index)
  // What: derive month categories from a seeded shuffle. Why: the demo should look organic from month to month while still staying deterministic for tests and offline bootstrap.
  const currentUnpaidAttendedMemberCount = Math.min(
    MAX_UNPAID_ATTENDED_MEMBER_COUNT,
    Math.max(1, currentSessions.length)
  )
  const currentMonthCategories = splitPaymentCategories({
    coveredMonth: currentCoveredMonth,
    memberIndexes,
    unpaidAbsentMemberCount: DEMO_UNPAID_ABSENT_MEMBER_COUNT,
    unpaidAttendedMemberCount: currentUnpaidAttendedMemberCount
  })
  // What: keep a few unpaid members in the previous month too. Why: demo mode should prove the monthly ledger stays useful beyond "right now" instead of making older months look unnaturally perfect.
  const previousMonthCategories = splitPaymentCategories({
    coveredMonth: previousCoveredMonth,
    memberIndexes,
    unpaidAbsentMemberCount: DEMO_PREVIOUS_MONTH_UNPAID_ABSENT_MEMBER_COUNT,
    unpaidAttendedMemberCount: MAX_PREVIOUS_MONTH_UNPAID_ATTENDED_MEMBER_COUNT
  })
  const currentMonthAttendanceLists = buildCurrentMonthAttendanceLists({
    currentCoveredMonth,
    paidMemberIndexes: currentMonthCategories.paidMemberIndexes,
    unpaidAttendedMemberIndexes:
      currentMonthCategories.unpaidAttendedMemberIndexes,
    sessionStarts: currentSessions
  })
  const previousMonthAttendanceLists = buildPreviousMonthAttendanceLists({
    previousCoveredMonth,
    paidMemberIndexes: previousMonthCategories.paidMemberIndexes,
    unpaidAttendedMemberIndexes:
      previousMonthCategories.unpaidAttendedMemberIndexes,
    sessionStarts: previousSessions
  })

  return {
    club: {
      name: 'Demo Grappling Club',
      foundingDate: new Date(2012, 8, 1)
    },
    trainer: {
      name: 'Coach Demo'
    },
    members,
    membershipPayments: [
      ...previousMonthCategories.paidMemberIndexes.map((memberIndex) => ({
        coveredMonth: previousCoveredMonth,
        memberIndex
      })),
      ...currentMonthCategories.paidMemberIndexes.map((memberIndex) => ({
        coveredMonth: currentCoveredMonth,
        memberIndex
      }))
    ],
    attendanceLists: [
      ...previousMonthAttendanceLists,
      ...currentMonthAttendanceLists
    ],
    summary: {
      currentCoveredMonth,
      previousCoveredMonth,
      currentMonthSessionCount: currentSessions.length,
      previousMonthSessionCount: previousSessions.length,
      currentPaidMemberIndexes: currentMonthCategories.paidMemberIndexes,
      currentUnpaidAbsentMemberIndexes:
        currentMonthCategories.unpaidAbsentMemberIndexes,
      currentUnpaidAttendedMemberIndexes:
        currentMonthCategories.unpaidAttendedMemberIndexes,
      previousPaidMemberIndexes: previousMonthCategories.paidMemberIndexes,
      previousUnpaidAbsentMemberIndexes:
        previousMonthCategories.unpaidAbsentMemberIndexes,
      previousUnpaidAttendedMemberIndexes:
        previousMonthCategories.unpaidAttendedMemberIndexes
    }
  }
}

function createDemoMembers(now: Date): DemoMemberSeed[] {
  return DEMO_MEMBER_NAMES.map((name, index) => {
    const age = DEMO_MEMBER_AGES[index]
    const dateOfBirth = new Date(now.getFullYear() - age, 0, 1)
    const yearsInClub = Math.min(
      Math.max(1, (index % 9) + 1),
      Math.max(1, age - 4)
    )
    const joinedAt = new Date(now.getFullYear() - yearsInClub, 0, 15)

    return {
      ...name,
      // What: synthesize birth dates from age buckets instead of real athlete biographies. Why: the demo needs a broad, filterable roster without implying any real-world personal data is stored locally.
      dateOfBirth,
      joinedAt,
      phoneNumber: `+48${String(500000000 + index).padStart(9, '0')}`
    }
  })
}

function buildCurrentMonthAttendanceLists({
  currentCoveredMonth,
  paidMemberIndexes,
  unpaidAttendedMemberIndexes,
  sessionStarts
}: {
  currentCoveredMonth: string
  paidMemberIndexes: number[]
  unpaidAttendedMemberIndexes: number[]
  sessionStarts: Date[]
}): DemoAttendanceListSeed[] {
  const sessionMemberSets = sessionStarts.map(() => new Set<number>())
  const rng = createSeededRng(`${currentCoveredMonth}:attendance`)
  const unpaidAttendanceTargets = buildVariedAttendanceTargets(
    sessionStarts.length,
    unpaidAttendedMemberIndexes.length,
    Math.min(6, sessionStarts.length)
  )

  unpaidAttendedMemberIndexes.forEach((memberIndex, index) => {
    assignMemberToRandomSessions(
      sessionMemberSets,
      memberIndex,
      unpaidAttendanceTargets[index],
      rng
    )
  })

  for (const memberIndex of paidMemberIndexes) {
    const targetAttendanceCount = randomInteger(
      0,
      Math.min(6, sessionStarts.length),
      rng
    )

    if (targetAttendanceCount === 0) {
      continue
    }

    assignMemberToRandomSessions(
      sessionMemberSets,
      memberIndex,
      targetAttendanceCount,
      rng
    )
  }

  // What: top up thin sessions with paid members only. Why: the seeded history should look like a believable month of coaching work without accidentally moving unpaid-absent or unpaid-attended members into the wrong payment bucket.
  ensureMinimumSessionSize(
    sessionMemberSets,
    Math.min(
      MIN_CURRENT_SESSION_SIZE,
      paidMemberIndexes.length + unpaidAttendedMemberIndexes.length
    ),
    paidMemberIndexes,
    rng
  )

  return sessionStarts.map((start, index) => ({
    start,
    memberIndexes: shuffle([...sessionMemberSets[index]], rng)
  }))
}

function buildPreviousMonthAttendanceLists({
  previousCoveredMonth,
  paidMemberIndexes,
  unpaidAttendedMemberIndexes,
  sessionStarts
}: {
  previousCoveredMonth: string
  paidMemberIndexes: number[]
  unpaidAttendedMemberIndexes: number[]
  sessionStarts: Date[]
}): DemoAttendanceListSeed[] {
  const sessionMemberSets = sessionStarts.map(() => new Set<number>())
  const rng = createSeededRng(`${previousCoveredMonth}:attendance`)
  const unpaidAttendanceTargets = buildVariedAttendanceTargets(
    sessionStarts.length,
    unpaidAttendedMemberIndexes.length,
    Math.min(6, sessionStarts.length)
  )

  unpaidAttendedMemberIndexes.forEach((memberIndex, index) => {
    assignMemberToRandomSessions(
      sessionMemberSets,
      memberIndex,
      unpaidAttendanceTargets[index],
      rng
    )
  })

  for (const memberIndex of paidMemberIndexes) {
    assignMemberToRandomSessions(
      sessionMemberSets,
      memberIndex,
      randomInteger(1, Math.min(7, sessionStarts.length), rng),
      rng
    )
  }

  // What: guarantee every archived session shows a healthy roster. Why: demo history should help coaches immediately see that saved sessions, counts, and edits already work offline.
  ensureMinimumSessionSize(
    sessionMemberSets,
    Math.min(
      MIN_PREVIOUS_SESSION_SIZE,
      paidMemberIndexes.length + unpaidAttendedMemberIndexes.length
    ),
    paidMemberIndexes,
    rng
  )

  return sessionStarts.map((start, index) => ({
    start,
    memberIndexes: shuffle([...sessionMemberSets[index]], rng)
  }))
}

function ensureMinimumSessionSize(
  sessionMemberSets: Set<number>[],
  minimumSessionSize: number,
  fillCandidates: number[],
  rng: () => number
) {
  if (minimumSessionSize === 0) {
    return
  }

  sessionMemberSets.forEach((memberSet) => {
    const shuffledCandidates = shuffle([...fillCandidates], rng)

    for (const memberIndex of shuffledCandidates) {
      if (memberSet.size >= minimumSessionSize) {
        break
      }

      memberSet.add(memberIndex)
    }
  })
}

function assignMemberToRandomSessions(
  sessionMemberSets: Set<number>[],
  memberIndex: number,
  attendanceCount: number,
  rng: () => number
) {
  const sessionIndexes = sampleDistinctSessionIndexes(
    sessionMemberSets.length,
    attendanceCount,
    rng
  )

  sessionIndexes.forEach((sessionIndex) => {
    sessionMemberSets[sessionIndex]?.add(memberIndex)
  })
}

function buildVariedAttendanceTargets(
  sessionCount: number,
  attendeeCount: number,
  maxTargetAttendanceCount: number
): number[] {
  const safeMaxTargetAttendanceCount = Math.max(
    1,
    Math.min(sessionCount, maxTargetAttendanceCount)
  )
  const candidates = [
    safeMaxTargetAttendanceCount,
    Math.max(1, safeMaxTargetAttendanceCount - 2),
    Math.max(1, Math.ceil(safeMaxTargetAttendanceCount / 2)),
    1
  ]
  const uniqueTargets = [...new Set(candidates)]
    .filter((count) => count <= sessionCount)
    .sort((left, right) => right - left)

  for (
    let candidate = Math.max(1, sessionCount - 1);
    uniqueTargets.length < attendeeCount && candidate >= 1;
    candidate -= 1
  ) {
    if (!uniqueTargets.includes(candidate)) {
      uniqueTargets.push(candidate)
    }
  }

  return uniqueTargets.slice(0, attendeeCount)
}

function splitPaymentCategories({
  coveredMonth,
  memberIndexes,
  unpaidAbsentMemberCount,
  unpaidAttendedMemberCount
}: {
  coveredMonth: string
  memberIndexes: number[]
  unpaidAbsentMemberCount: number
  unpaidAttendedMemberCount: number
}) {
  const monthMemberOrder = shuffle(
    [...memberIndexes],
    createSeededRng(`${coveredMonth}:categories`)
  )
  const unpaidAttendedMemberIndexes = monthMemberOrder.slice(
    0,
    unpaidAttendedMemberCount
  )
  const unpaidAbsentMemberIndexes = monthMemberOrder.slice(
    unpaidAttendedMemberCount,
    unpaidAttendedMemberCount + unpaidAbsentMemberCount
  )

  return {
    paidMemberIndexes: monthMemberOrder.slice(
      unpaidAttendedMemberCount + unpaidAbsentMemberCount
    ),
    unpaidAbsentMemberIndexes,
    unpaidAttendedMemberIndexes
  }
}

function sampleDistinctSessionIndexes(
  sessionCount: number,
  attendanceCount: number,
  rng: () => number
) {
  const uniqueAttendanceCount = Math.min(sessionCount, attendanceCount)
  const indexes = shuffle(
    Array.from({ length: sessionCount }, (_, index) => index),
    rng
  )

  return indexes
    .slice(0, uniqueAttendanceCount)
    .sort((left, right) => left - right)
}

function resolveCurrentMonthSessions(monthStart: Date, now: Date): Date[] {
  const pastTemplateSessions = createMonthSessions(monthStart).filter(
    (sessionStart) => sessionStart.getTime() <= now.getTime()
  )

  if (pastTemplateSessions.length > 0) {
    return pastTemplateSessions
  }

  const fallbackSession = new Date(now)

  fallbackSession.setMinutes(fallbackSession.getMinutes() - 15)

  // What: fall back to one immediately-past session only when the month has not yet reached the first template slot. Why: demo mode should never show an empty current month on the first morning of a calendar page.
  return [
    snapDateToQuarterHourGrid(
      fallbackSession.getTime() < monthStart.getTime()
        ? monthStart
        : fallbackSession
    )
  ]
}

function createMonthSessions(monthStart: Date): Date[] {
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

function randomInteger(minimum: number, maximum: number, rng: () => number) {
  if (maximum <= minimum) {
    return minimum
  }

  return Math.floor(rng() * (maximum - minimum + 1)) + minimum
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function addMonths(value: Date, offset: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1)
}

function snapDateToQuarterHourGrid(value: Date): Date {
  const snappedValue = new Date(value)
  const roundedMinutes = Math.round(snappedValue.getMinutes() / 15) * 15

  snappedValue.setSeconds(0, 0)
  snappedValue.setMinutes(roundedMinutes)

  return snappedValue
}

function createSeededRng(seedValue: string) {
  return mulberry32(hashString(seedValue))
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

function shuffle<T>(values: T[], rng: () => number): T[] {
  const copy = [...values]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1))
    const currentValue = copy[index]

    copy[index] = copy[randomIndex] as T
    copy[randomIndex] = currentValue as T
  }

  return copy
}
