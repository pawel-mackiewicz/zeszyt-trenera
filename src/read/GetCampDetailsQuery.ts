import type { TrainerNotebookDb } from '@/db'
import { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type {
  CampParticipantSnapshot,
  CampParticipantStatus
} from '@/write/camps/domain/CampParticipant'
import type {
  PersistedCamp,
  PersistedCampParticipant,
  PersistedCampParticipantFinancialTransaction,
  PersistedMember
} from '@/write/shared/infra'
import type { FinancialTransaction } from '@/write/shared/vo/FinancialTransaction'
import { Money, type MoneySnapshot } from '@/write/shared/vo/Money'

export type GetCampDetailsQueryInput = {
  campId: string
}

export type CampDetailsCamp = {
  id: string
  name: string
  startDate: Date
  finishDate: Date
}

export type CampDetailsParticipantListItem = {
  id: string
  addedAt: Date
  firstName: string
  lastName: string
  displayName: string
  age: number | null
}

export type CampDetailsActiveParticipantListItem =
  CampDetailsParticipantListItem & {
    amountDue: MoneySnapshot
    paidAmount: MoneySnapshot
    paymentProgressPercent: number
    hasDiscount: boolean
  }

export type CampDetailsResignedParticipantListItem =
  CampDetailsParticipantListItem & {
    amountToRefund: MoneySnapshot
  }

export type CampDetailsParticipantGroups = {
  registered: CampDetailsActiveParticipantListItem[]
  fullyPaid: CampDetailsActiveParticipantListItem[]
  resigned: CampDetailsResignedParticipantListItem[]
}

export type CampDetails = {
  camp: CampDetailsCamp
  participants: CampDetailsParticipantGroups
}

type MemberById = Map<string, PersistedMember>
type CampDetailsActiveStatus = Extract<
  CampParticipantStatus,
  'REGISTERED' | 'FULLY_PAID'
>
type CampDetailsResignedStatus = Exclude<
  CampParticipantStatus,
  CampDetailsActiveStatus
>
type GroupedCampDetailsParticipant =
  | {
      status: CampDetailsActiveStatus
      participant: CampDetailsActiveParticipantListItem
    }
  | {
      status: CampDetailsResignedStatus
      participant: CampDetailsResignedParticipantListItem
    }

export class GetCampDetailsQuery {
  public constructor(
    private readonly database: TrainerNotebookDb,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async handle(
    input: GetCampDetailsQueryInput
  ): Promise<CampDetails | null> {
    const camp = await this.database.camps.get(input.campId)

    if (!camp) {
      return null
    }

    const participants = await this.database.campParticipants
      .where('campId')
      .equals(input.campId)
      .toArray()
    const membersById = await this.getMembersById(participants)
    const now = this.now()

    return {
      camp: toCampDetailsCamp(camp),
      participants: groupParticipants(
        participants.map((participant) =>
          toParticipantListItem(participant, membersById, now)
        )
      )
    }
  }

  private async getMembersById(
    participants: PersistedCampParticipant[]
  ): Promise<MemberById> {
    const memberIds = [
      ...new Set(
        participants.flatMap((participant) =>
          participant.person.type === 'club'
            ? [participant.person.memberId]
            : []
        )
      )
    ]

    if (memberIds.length === 0) {
      return new Map()
    }

    const members = await this.database.members.bulkGet(memberIds)

    return new Map(
      members.flatMap((member) => (member ? [[member.id, member]] : []))
    )
  }
}

function toCampDetailsCamp(camp: PersistedCamp): CampDetailsCamp {
  return {
    id: camp.id,
    name: camp.name,
    startDate: new Date(camp.startDate),
    finishDate: new Date(camp.finishDate)
  }
}

function toParticipantListItem(
  persistedParticipant: PersistedCampParticipant,
  membersById: MemberById,
  now: Date
): GroupedCampDetailsParticipant {
  const participant = CampParticipant.rehydrate(
    toCampParticipantSnapshot(persistedParticipant)
  )
  const snapshot = participant.toSnapshot()
  const identity = resolveParticipantIdentity(persistedParticipant, membersById)
  const baseParticipant = {
    id: snapshot.id,
    addedAt: snapshot.addedAt,
    firstName: identity.firstName,
    lastName: identity.lastName,
    displayName: identity.displayName,
    age: resolveAge(persistedParticipant, membersById, now)
  }
  const financialBalance = participant.financialBalance().toSnapshot()

  if (snapshot.status !== 'REGISTERED' && snapshot.status !== 'FULLY_PAID') {
    return {
      status: snapshot.status,
      participant: {
        ...baseParticipant,
        amountToRefund: financialBalance
      }
    }
  }

  const amountDue = snapshot.totalAmountDue.toSnapshot()

  return {
    status: snapshot.status,
    participant: {
      ...baseParticipant,
      amountDue,
      paidAmount: financialBalance,
      paymentProgressPercent: resolvePaymentProgressPercent(
        amountDue.amountMinor,
        financialBalance.amountMinor
      ),
      hasDiscount: snapshot.discounts.length > 0
    }
  }
}

function toCampParticipantSnapshot(
  participant: PersistedCampParticipant
): CampParticipantSnapshot {
  return {
    id: participant.id,
    campId: participant.campId,
    person: participant.person,
    status: participant.status,
    totalAmountDue: Money.create(participant.totalAmountDue),
    discounts: participant.discounts.map((discount) => ({
      id: discount.id,
      amount: Money.create(discount.amount),
      reason: discount.reason,
      createdAt: new Date(discount.createdAt)
    })),
    financialTransactions: participant.financialTransactions.map(
      toFinancialTransaction
    ),
    addedAt: new Date(participant.addedAt),
    updatedAt: new Date(participant.updatedAt)
  }
}

function toFinancialTransaction(
  transaction: PersistedCampParticipantFinancialTransaction
): FinancialTransaction {
  const base = {
    id: transaction.id,
    amount: Money.create(transaction.amount),
    note: transaction.note,
    createdAt: new Date(transaction.createdAt)
  }

  if (transaction.type === 'non_refundable_deposit_reversal') {
    return {
      ...base,
      type: transaction.type,
      reversedTransactionId: transaction.reversedTransactionId
    }
  }

  return {
    ...base,
    type: transaction.type
  }
}

function resolveParticipantIdentity(
  participant: PersistedCampParticipant,
  membersById: MemberById
): {
  displayName: string
  firstName: string
  lastName: string
} {
  if (participant.person.type === 'external') {
    return {
      displayName: `${participant.person.firstName} ${participant.person.lastName}`,
      firstName: participant.person.firstName,
      lastName: participant.person.lastName
    }
  }

  const member = membersById.get(participant.person.memberId)

  if (!member) {
    return {
      displayName: participant.person.memberId,
      firstName: participant.person.memberId,
      lastName: ''
    }
  }

  return {
    displayName: `${member.firstName} ${member.lastName}`,
    firstName: member.firstName,
    lastName: member.lastName
  }
}

function resolveAge(
  participant: PersistedCampParticipant,
  membersById: MemberById,
  now: Date
): number | null {
  if (participant.person.type === 'external') {
    return null
  }

  const member = membersById.get(participant.person.memberId)

  return member ? calculateAge(member.dateOfBirth, now) : null
}

function calculateAge(value: Date, now: Date): number | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null
  }

  let age = now.getFullYear() - value.getFullYear()
  const birthdayThisYear = new Date(
    now.getFullYear(),
    value.getMonth(),
    value.getDate()
  )

  if (birthdayThisYear > now) {
    age -= 1
  }

  return age
}

function resolvePaymentProgressPercent(
  amountDueMinor: number,
  paidAmountMinor: number
): number {
  if (amountDueMinor <= 0) {
    return 100
  }

  return Math.min(100, Math.floor((paidAmountMinor / amountDueMinor) * 100))
}

function groupParticipants(
  participants: GroupedCampDetailsParticipant[]
): CampDetailsParticipantGroups {
  return participants.reduce<CampDetailsParticipantGroups>(
    (groups, participant) => {
      switch (participant.status) {
        case 'REGISTERED':
          groups.registered.push(participant.participant)
          break
        case 'FULLY_PAID':
          groups.fullyPaid.push(participant.participant)
          break
        case 'RESIGNED':
        case 'REFUNDED':
          groups.resigned.push(participant.participant)
          break
      }

      return groups
    },
    {
      registered: [],
      fullyPaid: [],
      resigned: []
    }
  )
}
