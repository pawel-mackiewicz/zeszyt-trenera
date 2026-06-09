// These row contracts describe local Dexie storage, so every persistence adapter shares the same offline schema without routing them through the app entrypoint.
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type PersistedClub = {
  id: string
  name: string
  foundingDate: Date
  createdAt: Date
}

export type PersistedTrainer = {
  id: string
  name: string
  createdAt: Date
}

export type PersistedMember = {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
  archived?: boolean
  archivedAt?: Date
  createdAt: Date
}

export type PersistedMembershipPayment = {
  id: string
  memberId: string
  coveredMonth: string
  createdAt: Date
}

export type PersistedAttendanceList = {
  id: string
  memberIds: string[]
  start: Date
  createdAt: Date
}

export type PersistedCamp = {
  id: string
  name: string
  note: string
  startDate: Date
  price: MoneySnapshot
  createdAt: Date
  updatedAt: Date
}

export type PersistedCampParticipantStatus =
  | 'REGISTERED'
  | 'FULLY_PAID'
  | 'RESIGNED'
  | 'REFUNDED'

export type PersistedCampParticipantPerson =
  | {
      type: 'club'
      memberId: string
    }
  | {
      type: 'external'
      firstName: string
      lastName: string
    }

export type PersistedCampParticipantDiscount = {
  id: string
  amount: MoneySnapshot
  reason: string
  createdAt: Date
}

export type PersistedCampParticipantFinancialTransaction = {
  type: 'payment' | 'refund'
  id: string
  amount: MoneySnapshot
  note: string
  createdAt: Date
}

export type PersistedCampParticipant = {
  id: string
  campId: string
  personKey: string
  person: PersistedCampParticipantPerson
  status: PersistedCampParticipantStatus
  totalAmountDue: MoneySnapshot
  discounts: PersistedCampParticipantDiscount[]
  financialTransactions: PersistedCampParticipantFinancialTransaction[]
  addedAt: Date
  updatedAt: Date
}

export type PersistedDomainEvent<TPayload> = {
  eventId: string
  eventName: string
  occurredAt: Date
  payload: TPayload
}
