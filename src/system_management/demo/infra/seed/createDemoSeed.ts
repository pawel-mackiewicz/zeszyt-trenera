import type {
  DemoAttendanceListSeed,
  DemoCampParticipantSeed,
  DemoCampSeed,
  DemoMemberSeed,
  DemoSeed
} from '@/system_management/demo/application/ports/DemoSeedFactoryPort.ts'
import type { MoneySnapshot } from '@/write/shared/vo/Money'
import { toMembershipPaymentCoveredMonth } from '@/write/memberships/domain/MembershipPayment.ts'
import {
  DEMO_MEMBER_PROFILES,
  DEMO_PREVIOUS_MONTH_UNPAID_ABSENT_MEMBER_COUNT,
  DEMO_UNPAID_ABSENT_MEMBER_COUNT,
  MAX_PREVIOUS_MONTH_UNPAID_ATTENDED_MEMBER_COUNT,
  MAX_UNPAID_ATTENDED_MEMBER_COUNT,
  MIN_CURRENT_SESSION_SIZE,
  MIN_PREVIOUS_SESSION_SIZE
} from '@/system_management/demo/infra/seed/demoSeedData.ts'
import {
  createMonthSessions,
  createSeededRng,
  resolveCurrentMonthSessions,
  shuffle,
  startOfMonth
} from '@/system_management/demo/infra/seed/demoSeedCalculations.ts'

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
  const campSeed = createDemoCamps(currentMonthStart)

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
    camps: campSeed.camps,
    campParticipants: campSeed.campParticipants,
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

function createDemoCamps(currentMonthStart: Date): {
  camps: DemoCampSeed[]
  campParticipants: DemoCampParticipantSeed[]
} {
  const springCampPrice = pln(850_00)
  const summerCampPrice = pln(1_450_00)
  const fundamentalsCampPrice = pln(950_00)
  const competitionCampPrice = pln(1_250_00)
  const kidsCampPrice = pln(650_00)

  const camps: DemoCampSeed[] = [
    {
      name: 'Spring fundamentals camp',
      note: 'Completed technical camp kept as a payment and roster reference.',
      startDate: campDate(currentMonthStart, -3, 11, 9),
      finishDate: campDate(currentMonthStart, -3, 13, 15),
      price: springCampPrice
    },
    {
      name: 'Summer sparring camp',
      note: 'Finished away camp with a larger mixed roster.',
      startDate: campDate(currentMonthStart, -1, 2, 10),
      finishDate: campDate(currentMonthStart, -1, 7, 16),
      price: summerCampPrice
    },
    {
      name: 'Fundamentals weekend camp',
      note: 'Beginner-friendly technical block with two mat sessions per day.',
      startDate: campDate(currentMonthStart, 1, 8, 9),
      finishDate: campDate(currentMonthStart, 1, 10, 15),
      price: fundamentalsCampPrice
    },
    {
      name: 'Competition preparation camp',
      note: 'Small group camp for athletes preparing for the autumn tournament run.',
      startDate: campDate(currentMonthStart, 3, 3, 10),
      finishDate: campDate(currentMonthStart, 3, 8, 16),
      price: competitionCampPrice
    },
    {
      name: 'Kids winter mat camp',
      note: 'Short school-break camp with games, movement work, and sparring rounds.',
      startDate: campDate(currentMonthStart, 5, 15, 9),
      finishDate: campDate(currentMonthStart, 5, 19, 14),
      price: kidsCampPrice
    }
  ]

  return {
    camps,
    campParticipants: [
      {
        campIndex: 0,
        person: { type: 'member', memberIndex: 8 },
        totalAmountDue: springCampPrice,
        initialPayment: {
          amount: springCampPrice,
          note: 'Settled after camp'
        }
      },
      {
        campIndex: 0,
        person: { type: 'member', memberIndex: 15 },
        totalAmountDue: springCampPrice,
        initialPayment: {
          amount: pln(400_00),
          note: 'Deposit kept on account'
        },
        resignation: {
          nonRefundableDeposit: {
            amount: pln(200_00),
            note: 'Administration and mat booking cost'
          }
        }
      },
      {
        campIndex: 0,
        person: {
          type: 'external',
          firstName: 'Kacper',
          lastName: 'Wisniewski'
        },
        totalAmountDue: springCampPrice,
        initialDiscount: {
          amount: pln(100_00),
          reason: 'Returning guest'
        },
        initialPayment: {
          amount: pln(750_00),
          note: 'Paid after discount'
        }
      },
      {
        campIndex: 1,
        person: { type: 'member', memberIndex: 21 },
        totalAmountDue: summerCampPrice,
        initialPayment: {
          amount: summerCampPrice,
          note: 'Full payment'
        }
      },
      {
        campIndex: 1,
        person: { type: 'member', memberIndex: 29 },
        totalAmountDue: summerCampPrice,
        initialPayment: {
          amount: pln(700_00),
          note: 'Partial payment'
        }
      },
      {
        campIndex: 1,
        person: {
          type: 'external',
          firstName: 'Natalia',
          lastName: 'Kaczmarek'
        },
        totalAmountDue: summerCampPrice
      },
      {
        campIndex: 2,
        person: { type: 'member', memberIndex: 4 },
        totalAmountDue: fundamentalsCampPrice,
        initialPayment: {
          amount: fundamentalsCampPrice,
          note: 'Paid in full during registration'
        }
      },
      {
        campIndex: 2,
        person: { type: 'member', memberIndex: 12 },
        totalAmountDue: fundamentalsCampPrice,
        initialPayment: {
          amount: pln(400_00),
          note: 'Deposit'
        }
      },
      {
        campIndex: 2,
        person: {
          type: 'external',
          firstName: 'Ola',
          lastName: 'Nowak'
        },
        totalAmountDue: fundamentalsCampPrice,
        initialDiscount: {
          amount: pln(150_00),
          reason: 'Sibling discount'
        },
        initialPayment: {
          amount: pln(800_00),
          note: 'Paid after discount'
        }
      },
      {
        campIndex: 2,
        person: { type: 'member', memberIndex: 18 },
        totalAmountDue: fundamentalsCampPrice
      },
      {
        campIndex: 3,
        person: { type: 'member', memberIndex: 24 },
        totalAmountDue: competitionCampPrice,
        initialPayment: {
          amount: competitionCampPrice,
          note: 'Full transfer'
        }
      },
      {
        campIndex: 3,
        person: { type: 'member', memberIndex: 31 },
        totalAmountDue: competitionCampPrice,
        initialDiscount: {
          amount: pln(250_00),
          reason: 'Coach invitation'
        },
        initialPayment: {
          amount: pln(500_00),
          note: 'First installment'
        }
      },
      {
        campIndex: 3,
        person: {
          type: 'external',
          firstName: 'Piotr',
          lastName: 'Lewandowski'
        },
        totalAmountDue: competitionCampPrice,
        resignation: {}
      },
      {
        campIndex: 4,
        person: { type: 'member', memberIndex: 0 },
        totalAmountDue: kidsCampPrice,
        initialPayment: {
          amount: kidsCampPrice,
          note: 'Parent paid in full'
        }
      },
      {
        campIndex: 4,
        person: { type: 'member', memberIndex: 3 },
        totalAmountDue: kidsCampPrice,
        initialPayment: {
          amount: pln(200_00),
          note: 'Reservation deposit'
        }
      },
      {
        campIndex: 4,
        person: {
          type: 'external',
          firstName: 'Maja',
          lastName: 'Zielinska'
        },
        totalAmountDue: kidsCampPrice,
        initialDiscount: {
          amount: pln(100_00),
          reason: 'Early signup'
        }
      }
    ]
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

function pln(amountMinor: number): MoneySnapshot {
  return {
    amountMinor,
    currency: 'PLN'
  }
}

function campDate(
  currentMonthStart: Date,
  monthOffset: number,
  day: number,
  hour: number
): Date {
  return new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() + monthOffset,
    day,
    hour,
    0,
    0
  )
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
