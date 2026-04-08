// These row contracts describe local Dexie storage, so every persistence adapter shares the same offline schema without routing them through the app entrypoint.
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
  dateOfBirth?: Date
  joinedAt?: Date
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

export type PersistedDomainEvent<TPayload> = {
  eventId: string
  eventName: string
  occurredAt: Date
  payload: TPayload
}
