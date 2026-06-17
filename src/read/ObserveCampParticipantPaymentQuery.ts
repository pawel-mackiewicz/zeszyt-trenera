import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import {
  loadCampParticipantForCamp,
  rehydrateCampParticipant,
  resolvePaymentProgressPercent,
  type CampParticipantQueryInput
} from '@/read/CampParticipantReadModel'
import { Camp } from '@/write/camps/domain/Camp'
import type { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type ObserveCampParticipantPaymentQueryInput = CampParticipantQueryInput

export type CampParticipantPaymentActiveStatus = 'registered' | 'fullyPaid'

export type CampParticipantPaymentActive = {
  status: CampParticipantPaymentActiveStatus
  basePrice: MoneySnapshot
  amountDue: MoneySnapshot
  discountSum: MoneySnapshot
  paidAmount: MoneySnapshot
  paymentProgressPercent: number
}

export type CampParticipantPaymentRefundStatus = 'resigned' | 'refunded'

export type CampParticipantPaymentRefund = {
  status: CampParticipantPaymentRefundStatus
  amountToRefund: MoneySnapshot
}

export type CampParticipantPayment =
  | CampParticipantPaymentActive
  | CampParticipantPaymentRefund

export class ObserveCampParticipantPaymentQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(
    input: ObserveCampParticipantPaymentQueryInput
  ): Observable<CampParticipantPayment | null> {
    return liveQuery(async () => {
      const participant = await loadCampParticipantForCamp(this.database, input)

      if (!participant) {
        return null
      }

      const camp = input.campId
        ? await this.database.camps.get(input.campId)
        : null

      return camp
        ? toCampParticipantPayment(
            rehydrateCampParticipant(participant),
            Camp.rehydrate(camp)
          )
        : null
    })
  }
}

function toCampParticipantPayment(
  participant: CampParticipant,
  camp: Camp
): CampParticipantPayment {
  const snapshot = participant.toSnapshot()
  const financialBalance = participant.financialBalance().toSnapshot()

  if (snapshot.status === 'RESIGNED' || snapshot.status === 'REFUNDED') {
    return {
      status: snapshot.status === 'REFUNDED' ? 'refunded' : 'resigned',
      amountToRefund: financialBalance
    }
  }

  const amountDue = snapshot.totalAmountDue.toSnapshot()

  return {
    status: snapshot.status === 'REGISTERED' ? 'registered' : 'fullyPaid',
    basePrice: camp.price.toSnapshot(),
    amountDue,
    discountSum: resolveDiscountSum(snapshot),
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
