import { toMembershipPaymentCoveredMonth } from '@/write/memberships/domain/MembershipPayment.ts'

import {
  DEMO_MEMBER_PROFILES,
  DEMO_UNPAID_ABSENT_MEMBER_COUNT,
  MAX_UNPAID_ATTENDED_MEMBER_COUNT
} from '@/system_management/demo/infra/seed/demoSeedData.ts'
import {
  createSeededRng,
  formatPolishMonthLabel,
  resolveCurrentMonthSessions,
  shuffle,
  startOfMonth
} from '@/system_management/demo/infra/seed/demoSeedCalculations.ts'

export type DemoPaymentMemberTarget = {
  age: number
  fullName: string
  attendanceCount?: number
}

export type DemoPaymentTargets = {
  absent: DemoPaymentMemberTarget
  attended: DemoPaymentMemberTarget & {
    attendanceCount: number
  }
  paid: DemoPaymentMemberTarget
  monthLabel: string
}

export function currentDemoPaymentTargets(
  now = new Date()
): DemoPaymentTargets {
  const monthStart = startOfMonth(now)
  const coveredMonth = toMembershipPaymentCoveredMonth(monthStart)
  const currentSessions = resolveCurrentMonthSessions(monthStart, now)
  const attendedCount = Math.min(
    MAX_UNPAID_ATTENDED_MEMBER_COUNT,
    Math.max(1, currentSessions.length)
  )
  const memberOrder = shuffle(
    Array.from({ length: DEMO_MEMBER_PROFILES.length }, (_, index) => index),
    createSeededRng(`${coveredMonth}:categories`)
  )
  const attendedIndexes = memberOrder.slice(0, attendedCount)
  const attendanceTargets = buildVariedAttendanceTargets(
    currentSessions.length,
    attendedIndexes.length,
    Math.min(6, currentSessions.length)
  )
  const absentIndexes = memberOrder.slice(
    attendedCount,
    attendedCount + DEMO_UNPAID_ABSENT_MEMBER_COUNT
  )
  const attendedIndex = attendedIndexes[0] as number
  const absentIndex = absentIndexes[0] as number
  const paidIndex = memberOrder[
    attendedCount + DEMO_UNPAID_ABSENT_MEMBER_COUNT
  ] as number

  return {
    attended: {
      ...demoMemberTarget(attendedIndex),
      attendanceCount: attendanceTargets[0] as number
    },
    absent: demoMemberTarget(absentIndex),
    paid: demoMemberTarget(paidIndex),
    monthLabel: formatPolishMonthLabel(monthStart)
  }
}

function demoMemberTarget(index: number): DemoPaymentMemberTarget {
  const profile = DEMO_MEMBER_PROFILES[index]

  if (profile === undefined) {
    throw new Error(`Missing demo member profile for index ${index}`)
  }

  return {
    fullName: `${profile.firstName} ${profile.lastName}`,
    age: profile.age
  }
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
