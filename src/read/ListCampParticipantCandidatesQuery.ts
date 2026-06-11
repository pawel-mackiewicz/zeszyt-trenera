import type { TrainerNotebookDb } from '@/db'
import { copyDate, copyOptionalDate } from '@/write/shared/DateUtils'

export type ListCampParticipantCandidatesQueryInput = {
  campId: string
}

export type CampParticipantCandidateListItem = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  joinedAt?: Date
  alreadySigned: boolean
}

export class ListCampParticipantCandidatesQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(
    input: ListCampParticipantCandidatesQueryInput
  ): Promise<CampParticipantCandidateListItem[]> {
    const [members, participants] = await Promise.all([
      this.database.members.toArray(),
      this.database.campParticipants
        .where('campId')
        .equals(input.campId)
        .toArray()
    ])
    const signedMemberIds = new Set(
      participants.flatMap((participant) =>
        participant.person.type === 'club' ? [participant.person.memberId] : []
      )
    )

    // What: expose signed status as read-model data only. Why: the screen owns display ordering, while the query owns local-first membership facts.
    return members
      .filter((member) => member.archived !== true)
      .map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: copyDate(member.dateOfBirth),
        joinedAt: copyOptionalDate(member.joinedAt),
        alreadySigned: signedMemberIds.has(member.id)
      }))
  }
}
