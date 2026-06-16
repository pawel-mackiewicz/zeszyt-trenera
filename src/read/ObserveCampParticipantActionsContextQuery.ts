import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import {
  loadCampParticipantForCamp,
  rehydrateCampParticipant,
  resolveParticipantDisplayName,
  toCampParticipantReadStatus,
  type CampParticipantQueryInput,
  type CampParticipantReadStatus
} from '@/read/CampParticipantReadModel'
import type { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type {
  PersistedCampParticipant,
  PersistedMember
} from '@/write/shared/infra'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type ObserveCampParticipantActionsContextQueryInput =
  CampParticipantQueryInput

export type CampParticipantActionsContext = {
  status: CampParticipantReadStatus
  canAcceptResignation: boolean
  canGrantDiscount: boolean
  canRegisterPayment: boolean
  paymentPrefillAmount: MoneySnapshot | null
  refundableBalance: MoneySnapshot
  subject: {
    campName: string
    participantDisplayName: string
  }
}

export class ObserveCampParticipantActionsContextQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(
    input: ObserveCampParticipantActionsContextQueryInput
  ): Observable<CampParticipantActionsContext | null> {
    return liveQuery(async () => {
      const [camp, participant] = await Promise.all([
        input.campId ? this.database.camps.get(input.campId) : undefined,
        loadCampParticipantForCamp(this.database, input)
      ])

      if (!camp || !participant) {
        return null
      }

      const member = await loadParticipantMember(this.database, participant)

      return toCampParticipantActionsContext(
        rehydrateCampParticipant(participant),
        {
          campName: camp.name,
          participantDisplayName: resolveParticipantDisplayName(
            participant,
            member
          )
        }
      )
    })
  }
}

function toCampParticipantActionsContext(
  participant: CampParticipant,
  subject: CampParticipantActionsContext['subject']
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
        : null,
    refundableBalance: paidAmount,
    subject
  }
}

async function loadParticipantMember(
  database: TrainerNotebookDb,
  participant: PersistedCampParticipant
): Promise<PersistedMember | undefined> {
  return participant.person.type === 'club'
    ? await database.members.get(participant.person.memberId)
    : undefined
}
