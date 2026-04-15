// Why: bootstrap orchestration should depend on one application contract so demo data generation can move across infra modules without touching use-case policy code.
type DemoNameSeed = {
  firstName: string
  lastName: string
}

export type DemoMemberSeed = DemoNameSeed & {
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

export type DemoSeedFactoryPort = {
  createSeed(now: Date): DemoSeed
}
