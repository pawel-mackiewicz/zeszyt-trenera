import type { TrainerNotebookDb } from '@/db'

export type AttendanceEditorMemberListItem = {
  id: string
  firstName: string
  lastName: string
  age: number
}

export class ListMembersForAttendanceEditorQuery {
  public constructor(
    private readonly database: TrainerNotebookDb,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  public async handle(): Promise<AttendanceEditorMemberListItem[]> {
    const now = this.nowProvider()
    const persistedMembers = await this.database.members.toArray()

    // What: project roster rows to attendance-only fields with derived age. Why: the attendance picker must not receive unrelated personal data when it only needs identity and age filtering.
    return persistedMembers.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      age: toAge(member.dateOfBirth, now)
    }))
  }
}

function toAge(value: Date, now: Date): number {
  if (Number.isNaN(value.getTime())) {
    return 0
  }

  let age = now.getFullYear() - value.getFullYear()
  const monthDelta = now.getMonth() - value.getMonth()

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < value.getDate())) {
    age -= 1
  }

  return age
}
