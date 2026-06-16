import type { TrainerNotebookDb } from '@/db'
import { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type { CampParticipantSnapshot } from '@/write/camps/domain/CampParticipant'
import type {
  PersistedCamp,
  PersistedCampParticipant,
  PersistedCampParticipantFinancialTransaction,
  PersistedMember
} from '@/write/shared/infra'
import type { FinancialTransaction } from '@/write/shared/vo/FinancialTransaction'
import { Money, type MoneySnapshot } from '@/write/shared/vo/Money'

export type GetCampParticipantDetailsQueryInput = {
  campId: string
  participantId: string
}

export type CampParticipantDetailsCamp = {
  name: string
  startDate: Date
  finishDate: Date
}

export type CampParticipantDetailsActiveStatus = 'registered' | 'fullyPaid'
export type CampParticipantDetailsStatus =
  | CampParticipantDetailsActiveStatus
  | 'resigned'

export type CampParticipantDetailsActiveParticipant = {
  displayName: string
  status: CampParticipantDetailsActiveStatus
  amountDue: MoneySnapshot
  paidAmount: MoneySnapshot
  paymentProgressPercent: number
}

export type CampParticipantDetailsResignedParticipant = {
  displayName: string
  status: 'resigned'
  amountToRefund: MoneySnapshot
}

export type CampParticipantDetailsParticipant =
  | CampParticipantDetailsActiveParticipant
  | CampParticipantDetailsResignedParticipant

export type CampParticipantDetails = {
  camp: CampParticipantDetailsCamp
  participant: CampParticipantDetailsParticipant
}

export class GetCampParticipantDetailsQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(
    input: GetCampParticipantDetailsQueryInput
  ): Promise<CampParticipantDetails | null> {
    const [camp, participant] = await Promise.all([
      this.database.camps.get(input.campId),
      this.database.campParticipants.get(input.participantId)
    ])

    if (!camp || !participant || participant.campId !== input.campId) {
      return null
    }

    const member =
      participant.person.type === 'club'
        ? await this.database.members.get(participant.person.memberId)
        : undefined

    return {
      camp: toCampParticipantDetailsCamp(camp),
      participant: toCampParticipantDetailsParticipant(participant, member)
    }
  }
}

function toCampParticipantDetailsCamp(
  camp: PersistedCamp
): CampParticipantDetailsCamp {
  return {
    name: camp.name,
    startDate: new Date(camp.startDate),
    finishDate: new Date(camp.finishDate)
  }
}

function toCampParticipantDetailsParticipant(
  persistedParticipant: PersistedCampParticipant,
  member?: PersistedMember
): CampParticipantDetailsParticipant {
  const participant = CampParticipant.rehydrate(
    toCampParticipantSnapshot(persistedParticipant)
  )
  const snapshot = participant.toSnapshot()
  const displayName = resolveParticipantDisplayName(
    persistedParticipant,
    member
  )
  const financialBalance = participant.financialBalance().toSnapshot()

  if (snapshot.status !== 'REGISTERED' && snapshot.status !== 'FULLY_PAID') {
    return {
      displayName,
      status: 'resigned',
      amountToRefund: financialBalance
    }
  }

  const amountDue = snapshot.totalAmountDue.toSnapshot()

  return {
    displayName,
    status: snapshot.status === 'REGISTERED' ? 'registered' : 'fullyPaid',
    amountDue,
    paidAmount: financialBalance,
    paymentProgressPercent: resolvePaymentProgressPercent(
      amountDue.amountMinor,
      financialBalance.amountMinor
    )
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

function resolveParticipantDisplayName(
  participant: PersistedCampParticipant,
  member?: PersistedMember
): string {
  if (participant.person.type === 'external') {
    return `${participant.person.firstName} ${participant.person.lastName}`
  }

  return member
    ? `${member.firstName} ${member.lastName}`
    : participant.person.memberId
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
