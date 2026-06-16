import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import {
  loadCampParticipantForCamp,
  rehydrateCampParticipant,
  resolvePaymentProgressPercent,
  type CampParticipantQueryInput
} from '@/read/CampParticipantReadModel'
import type { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type ObserveCampParticipantPaymentQueryInput = CampParticipantQueryInput

export type CampParticipantPaymentActiveStatus = 'registered' | 'fullyPaid'

export type CampParticipantPaymentActive = {
  status: CampParticipantPaymentActiveStatus
  amountDue: MoneySnapshot
  discountSum: MoneySnapshot
  paidAmount: MoneySnapshot
  paymentProgressPercent: number
}

export type CampParticipantPaymentResigned = {
  status: 'resigned'
  amountToRefund: MoneySnapshot
  discountSum: MoneySnapshot
}

export type CampParticipantPayment =
  | CampParticipantPaymentActive
  | CampParticipantPaymentResigned

export class ObserveCampParticipantPaymentQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(
    input: ObserveCampParticipantPaymentQueryInput
  ): Observable<CampParticipantPayment | null> {
    return liveQuery(async () => {
      const participant = await loadCampParticipantForCamp(this.database, input)

      return participant
        ? toCampParticipantPayment(rehydrateCampParticipant(participant))
        : null
    })
  }
}

function toCampParticipantPayment(
  participant: CampParticipant
): CampParticipantPayment {
  const snapshot = participant.toSnapshot()
  const financialBalance = participant.financialBalance().toSnapshot()
  const discountSum = resolveDiscountSum(snapshot)

  if (snapshot.status !== 'REGISTERED' && snapshot.status !== 'FULLY_PAID') {
    return {
      status: 'resigned',
      amountToRefund: financialBalance,
      discountSum
    }
  }

  const amountDue = snapshot.totalAmountDue.toSnapshot()

  return {
    status: snapshot.status === 'REGISTERED' ? 'registered' : 'fullyPaid',
    amountDue,
    discountSum,
    paidAmount: financialBalance,
    paymentProgressPercent: resolvePaymentProgressPercent(
      amountDue.amountMinor,
      financialBalance.amountMinor
    )
  }
}

function resolveDiscountSum(
  snapshot: ReturnType<CampParticipant['toSnapshot']>
): MoneySnapshot {
  return {
    amountMinor: snapshot.discounts.reduce(
      (total, discount) => total + discount.amount.amountMinor,
      0
    ),
    currency: snapshot.totalAmountDue.currency
  }
}
