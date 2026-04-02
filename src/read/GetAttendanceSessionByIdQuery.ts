import type { TrainerNotebookDb } from '@/db'

export type AttendanceSessionDetails = {
  id: string
  memberIds: string[]
  start: Date
}

export type GetAttendanceSessionByIdQueryInput = {
  attendanceListId: string
}

export class GetAttendanceSessionByIdQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle({
    attendanceListId
  }: GetAttendanceSessionByIdQueryInput): Promise<AttendanceSessionDetails | null> {
    const persistedAttendanceList =
      await this.database.attendanceLists.get(attendanceListId)

    if (!persistedAttendanceList) {
      return null
    }

    // The edit screen only needs the persisted roster snapshot and session start, so the query keeps storage-only metadata out of the UI contract.
    return {
      id: persistedAttendanceList.id,
      memberIds: [...persistedAttendanceList.memberIds],
      start: new Date(persistedAttendanceList.start)
    }
  }
}
