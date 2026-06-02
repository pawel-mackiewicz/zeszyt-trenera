import type { TrainerNotebookDb } from '@/db'
import { copyDate, copyOptionalDate } from '@/write/domain/model/DateUtils'

export type ArchivedMemberRosterListItem = {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
}

export class ListArchivedMembersForRosterQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(): Promise<ArchivedMemberRosterListItem[]> {
    const archivedMembers = await this.database.members
      .toCollection()
      .filter((member) => member.archived === true)
      .toArray()

    // What: expose only roster fields for archived members. Why: the archived roster view should get a dedicated read model without storage-only metadata or active members mixed in.
    return archivedMembers.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      dateOfBirth: copyDate(member.dateOfBirth),
      joinedAt: copyOptionalDate(member.joinedAt)
    }))
  }
}
