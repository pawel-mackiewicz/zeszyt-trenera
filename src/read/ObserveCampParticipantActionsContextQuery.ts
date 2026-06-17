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
  canCancelResignation: boolean
  canGrantDiscount: boolean
  canRegisterPayment: boolean
  canRegisterRefund: boolean
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
  const remainingAmountToPay = participant.remainingAmountToPay().toSnapshot()
  const refundableBalance = participant.financialBalance().toSnapshot()
  const canRegisterPayment = participant.canRegisterPayment()

  return {
    status: toCampParticipantReadStatus(participant.status),
    canAcceptResignation: participant.canResign(),
    canCancelResignation: participant.canCancelResignation(),
    canGrantDiscount: participant.canApplyDiscount(),
    canRegisterPayment,
    canRegisterRefund: participant.canRegisterRefund(),
    paymentPrefillAmount:
      canRegisterPayment && remainingAmountToPay.amountMinor > 0
        ? remainingAmountToPay
        : null,
    refundableBalance,
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
