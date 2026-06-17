import { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type {
  CampParticipantSnapshot,
  CampParticipantStatus
} from '@/write/camps/domain/CampParticipant'
import type {
  PersistedCampParticipant,
  PersistedCampParticipantFinancialTransaction,
  PersistedMember
} from '@/write/shared/infra'
import type { FinancialTransaction } from '@/write/shared/vo/FinancialTransaction'
import { Money } from '@/write/shared/vo/Money'
import type { TrainerNotebookDb } from '@/db'

export type CampParticipantQueryInput = {
  campId: string
  participantId: string
}

export type CampParticipantReadStatus =
  | 'registered'
  | 'fullyPaid'
  | 'resigned'
  | 'refunded'

export async function loadCampParticipantForCamp(
  database: TrainerNotebookDb,
  input: CampParticipantQueryInput
): Promise<PersistedCampParticipant | null> {
  if (!input.campId || !input.participantId) {
    return null
  }

  const participant = await database.campParticipants.get(input.participantId)

  return participant && participant.campId === input.campId ? participant : null
}

export function rehydrateCampParticipant(
  participant: PersistedCampParticipant
): CampParticipant {
  return CampParticipant.rehydrate(toCampParticipantSnapshot(participant))
}

export function resolveParticipantDisplayName(
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

export function resolvePaymentProgressPercent(
  amountDueMinor: number,
  paidAmountMinor: number
): number {
  if (amountDueMinor <= 0) {
    return 100
  }

  return Math.min(100, Math.floor((paidAmountMinor / amountDueMinor) * 100))
}

export function toCampParticipantReadStatus(
  status: CampParticipantStatus
): CampParticipantReadStatus {
  if (status === 'REGISTERED') {
    return 'registered'
  }

  if (status === 'FULLY_PAID') {
    return 'fullyPaid'
  }

  if (status === 'REFUNDED') {
    return 'refunded'
  }

  return 'resigned'
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
