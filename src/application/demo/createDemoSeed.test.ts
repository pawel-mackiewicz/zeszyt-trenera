import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/application/demo/createDemoSeed'
import { calculateAge } from '@/ui/utils/age'

describe('createDemoSeed', () => {
  it('derives current and previous months from runtime now, not a hard-coded year', () => {
    const april2026Seed = createDemoSeed(new Date(2026, 3, 9, 12, 0, 0))
    const april2027Seed = createDemoSeed(new Date(2027, 3, 9, 12, 0, 0))

    expect(april2026Seed.summary.currentCoveredMonth).toBe('2026-04')
    expect(april2026Seed.summary.previousCoveredMonth).toBe('2026-03')
    expect(april2027Seed.summary.currentCoveredMonth).toBe('2027-04')
    expect(april2027Seed.summary.previousCoveredMonth).toBe('2027-03')
  })

  it('spans ages from 5 to 75 in the seeded roster', () => {
    const now = new Date(2026, 3, 9, 12, 0, 0)
    const seed = createDemoSeed(now)
    const ages = seed.members
      .map((member) => calculateAge(member.dateOfBirth, now))
      .filter((age): age is number => age !== null)

    expect(Math.min(...ages)).toBe(5)
    expect(Math.max(...ages)).toBe(75)
  })

  it('keeps previous month full, current month past-only, and unpaid attendance varied', () => {
    const now = new Date(2026, 3, 9, 12, 0, 0)
    const seed = createDemoSeed(now)
    const currentMonthAttendanceLists = seed.attendanceLists.filter(
      (attendanceList) => attendanceList.start.getMonth() === now.getMonth()
    )
    const currentMonthStarts = currentMonthAttendanceLists.map(
      (attendanceList) => attendanceList.start
    )
    const currentUnpaidAttendanceCounts =
      seed.summary.currentUnpaidAttendedMemberIndexes
        .map(
          (memberIndex) =>
            currentMonthAttendanceLists.filter((attendanceList) =>
              attendanceList.memberIndexes.includes(memberIndex)
            ).length
        )
        .sort((left, right) => right - left)
    const previousMonthAttendanceLists = seed.attendanceLists.filter(
      (attendanceList) =>
        attendanceList.start.getMonth() ===
        new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth()
    )
    const previousUnpaidAttendanceCounts =
      seed.summary.previousUnpaidAttendedMemberIndexes
        .map(
          (memberIndex) =>
            previousMonthAttendanceLists.filter((attendanceList) =>
              attendanceList.memberIndexes.includes(memberIndex)
            ).length
        )
        .sort((left, right) => right - left)

    expect(seed.summary.previousMonthSessionCount).toBe(15)
    expect(seed.summary.currentMonthSessionCount).toBe(
      currentMonthStarts.length
    )
    expect(
      currentMonthStarts.every((start) => start.getTime() <= now.getTime())
    ).toBe(true)
    expect(seed.summary.currentPaidMemberIndexes.length).toBeGreaterThan(0)
    expect(
      seed.summary.currentUnpaidAbsentMemberIndexes.length
    ).toBeGreaterThan(0)
    expect(
      seed.summary.currentUnpaidAttendedMemberIndexes.length
    ).toBeGreaterThan(0)
    expect(seed.summary.previousPaidMemberIndexes.length).toBeGreaterThan(0)
    expect(
      seed.summary.previousUnpaidAbsentMemberIndexes.length
    ).toBeGreaterThan(0)
    expect(
      seed.summary.previousUnpaidAttendedMemberIndexes.length
    ).toBeGreaterThan(0)
    expect(new Set(currentUnpaidAttendanceCounts).size).toBeGreaterThan(1)
    expect(new Set(previousUnpaidAttendanceCounts).size).toBeGreaterThan(1)
  })
})
