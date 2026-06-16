import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import {
  loadCampParticipantForCamp,
  rehydrateCampParticipant,
  toCampParticipantReadStatus,
  type CampParticipantQueryInput,
  type CampParticipantReadStatus
} from '@/read/CampParticipantReadModel'
import type { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type ObserveCampParticipantActionsContextQueryInput =
  CampParticipantQueryInput

export type CampParticipantActionsContext = {
  status: CampParticipantReadStatus
  canAcceptResignation: boolean
  canGrantDiscount: boolean
  canRegisterPayment: boolean
  paymentPrefillAmount: MoneySnapshot | null
}

export class ObserveCampParticipantActionsContextQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(
    input: ObserveCampParticipantActionsContextQueryInput
  ): Observable<CampParticipantActionsContext | null> {
    return liveQuery(async () => {
      const participant = await loadCampParticipantForCamp(this.database, input)

      return participant
        ? toCampParticipantActionsContext(rehydrateCampParticipant(participant))
        : null
    })
  }
}

function toCampParticipantActionsContext(
  participant: CampParticipant
): CampParticipantActionsContext {
  const snapshot = participant.toSnapshot()
  const isActive =
    snapshot.status === 'REGISTERED' || snapshot.status === 'FULLY_PAID'
  const amountDue = snapshot.totalAmountDue.toSnapshot()
  const paidAmount = participant.financialBalance().toSnapshot()
  const remainingAmountMinor = Math.max(
    0,
    amountDue.amountMinor - paidAmount.amountMinor
  )

  return {
    status: toCampParticipantReadStatus(snapshot.status),
    canAcceptResignation: isActive,
    canGrantDiscount: isActive,
    canRegisterPayment: isActive,
    paymentPrefillAmount:
      isActive && remainingAmountMinor > 0
        ? {
            amountMinor: remainingAmountMinor,
            currency: amountDue.currency
          }
        : null
  }
}
