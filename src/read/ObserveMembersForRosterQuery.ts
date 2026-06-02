import { liveQuery, type Observable } from 'dexie'

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

export class ObserveMembersForRosterQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle(): Observable<MemberRosterListItem[]> {
    return liveQuery(async () => {
      const persistedMembers = await this.database.members.toArray()
      const activeMembers = persistedMembers.filter(
        (member) => member.archived !== true
      )

      // What: expose only roster fields through a live read model. Why: the members screen should refresh automatically when local writes change the roster, without storing extra metadata in the UI layer.
      return activeMembers.map((member) => ({
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
