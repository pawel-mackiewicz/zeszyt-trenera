import type {
  DemoAttendanceListSeed,
  DemoMemberSeed,
  DemoSeed
} from '@/write/application/ports/DemoSeedFactoryPort.ts'
import { toMembershipPaymentCoveredMonth } from '@/write/domain/model/MembershipPayment.ts'
import {
  DEMO_MEMBER_PROFILES,
  DEMO_PREVIOUS_MONTH_UNPAID_ABSENT_MEMBER_COUNT,
  DEMO_UNPAID_ABSENT_MEMBER_COUNT,
  MAX_PREVIOUS_MONTH_UNPAID_ATTENDED_MEMBER_COUNT,
  MAX_UNPAID_ATTENDED_MEMBER_COUNT,
  MIN_CURRENT_SESSION_SIZE,
  MIN_PREVIOUS_SESSION_SIZE
} from '@/write/infra/demo/demoSeedData.ts'
import {
  createMonthSessions,
  createSeededRng,
  resolveCurrentMonthSessions,
  shuffle,
  startOfMonth
} from '@/write/infra/demo/demoSeedCalculations.ts'

// Why: infra owns the concrete seeding algorithm, but the payload contract stays in the application layer to keep bootstrap orchestration dependency-safe.

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
  return DEMO_MEMBER_PROFILES.map(({ firstName, lastName, age }, index) => {
    const dateOfBirth = new Date(now.getFullYear() - age, 0, 1)
    const yearsInClub = Math.min(
      Math.max(1, (index % 9) + 1),
      Math.max(1, age - 4)
    )
    const joinedAt = new Date(now.getFullYear() - yearsInClub, 0, 15)

    return {
      firstName,
      lastName,
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

function randomInteger(minimum: number, maximum: number, rng: () => number) {
  if (maximum <= minimum) {
    return minimum
  }

  return Math.floor(rng() * (maximum - minimum + 1)) + minimum
}

function addMonths(value: Date, offset: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1)
}
