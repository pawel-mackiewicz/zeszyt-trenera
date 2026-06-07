import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import { copyDate, copyOptionalDate } from '@/write/shared/DateUtils'

export type ArchivedMemberRosterListItem = {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
}

export class ObserveArchivedMembersForRosterQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(): Observable<ArchivedMemberRosterListItem[]> {
    return liveQuery(async () => {
      const archivedMembers = await this.database.members
        .toCollection()
        .filter((member) => member.archived === true)
        .toArray()

      // What: expose only roster fields through a live archived-member read model. Why: the archived roster view should refresh when members are archived or restored without duplicating storage logic in the UI.
      return archivedMembers.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        phoneNumber: member.phoneNumber,
        dateOfBirth: copyDate(member.dateOfBirth),
        joinedAt: copyOptionalDate(member.joinedAt)
      }))
    })
  }
}
