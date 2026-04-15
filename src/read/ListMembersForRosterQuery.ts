import type { TrainerNotebookDb } from '@/db'
import { copyDate, copyOptionalDate } from '@/write/domain/model/DateUtils'

export type MemberRosterListItem = {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
}

export class ListMembersForRosterQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(): Promise<MemberRosterListItem[]> {
    const persistedMembers = await this.database.members.toArray()

    // What: expose only roster fields for details and inline edits. Why: the members screen should not receive storage-only metadata that it never renders.
    return persistedMembers.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      dateOfBirth: copyDate(member.dateOfBirth),
      joinedAt: copyOptionalDate(member.joinedAt)
    }))
  }
}
