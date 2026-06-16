import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import {
  loadCampParticipantForCamp,
  resolveParticipantDisplayName,
  toCampParticipantReadStatus,
  type CampParticipantReadStatus,
  type CampParticipantQueryInput
} from '@/read/CampParticipantReadModel'
import type {
  PersistedCamp,
  PersistedCampParticipant,
  PersistedMember
} from '@/write/shared/infra'

export type ObserveCampParticipantDetailsQueryInput = CampParticipantQueryInput

export type CampParticipantDetailsCamp = {
  name: string
  startDate: Date
  finishDate: Date
}

export type CampParticipantDetailsParticipant = {
  displayName: string
  status: CampParticipantReadStatus
}

export type CampParticipantDetails = {
  camp: CampParticipantDetailsCamp
  participant: CampParticipantDetailsParticipant
}

export class ObserveCampParticipantDetailsQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(
    input: ObserveCampParticipantDetailsQueryInput
  ): Observable<CampParticipantDetails | null> {
    return liveQuery(async () => {
      const [camp, participant] = await Promise.all([
        input.campId ? this.database.camps.get(input.campId) : undefined,
        loadCampParticipantForCamp(this.database, input)
      ])

      if (!camp || !participant) {
        return null
      }

      const member = await loadParticipantMember(this.database, participant)

      return {
        camp: toCampParticipantDetailsCamp(camp),
        participant: toCampParticipantDetailsParticipant(participant, member)
      }
    })
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
  participant: PersistedCampParticipant,
  member?: PersistedMember
): CampParticipantDetailsParticipant {
  return {
    displayName: resolveParticipantDisplayName(participant, member),
    status: toCampParticipantReadStatus(participant.status)
  }
}
