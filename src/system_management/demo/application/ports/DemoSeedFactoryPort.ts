// Why: bootstrap orchestration should depend on one application contract so demo data generation can move across infra modules without touching use-case policy code.
import type { MoneySnapshot } from '@/write/shared/vo/Money'

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

export type DemoCampSeed = {
  name: string
  note?: string
  startDate: Date
  finishDate: Date
  price: MoneySnapshot
}

export type DemoCampParticipantPersonSeed =
  | {
      type: 'member'
      memberIndex: number
    }
  | {
      type: 'external'
      firstName: string
      lastName: string
    }

export type DemoCampParticipantSeed = {
  campIndex: number
  person: DemoCampParticipantPersonSeed
  totalAmountDue: MoneySnapshot
  initialDiscount?: {
    amount: MoneySnapshot
    reason?: string
  }
  initialPayment?: {
    amount: MoneySnapshot
    note?: string
  }
  resignation?: {
    nonRefundableDeposit?: {
      amount: MoneySnapshot
      note?: string
    }
  }
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
  camps: DemoCampSeed[]
  campParticipants: DemoCampParticipantSeed[]
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
