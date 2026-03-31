import type { TrainerNotebookDb } from '@/db'

export type AttendanceSessionListItem = {
  id: string
  start: Date
  attendanceCount: number
}

export type ListAttendanceSessionsByMonthQueryInput = {
  monthStart: Date
  nextMonthStart: Date
}

export class ListAttendanceSessionsByMonthQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle({
    monthStart,
    nextMonthStart
  }: ListAttendanceSessionsByMonthQueryInput): Promise<
    AttendanceSessionListItem[]
  > {
    // The query keeps month boundaries in the application layer so UI screens can ask for one calendar period without learning persistence-specific range semantics.
    return this.listByStartRange(monthStart, nextMonthStart)
  }

  public async listByStartRange(
    startInclusive: Date,
    startExclusive: Date
  ): Promise<AttendanceSessionListItem[]> {
    const persistedAttendanceLists = await this.database.attendanceLists
      .where('start')
      .between(startInclusive, startExclusive, true, false)
      .toArray()

    // The history screen reads one month at a time, so mapping counts here keeps the UI on a stable summary shape instead of leaking stored member-id arrays across the boundary.
    return persistedAttendanceLists
      .sort((left, right) => right.start.getTime() - left.start.getTime())
      .map((attendanceList) => ({
        id: attendanceList.id,
        start: attendanceList.start,
        attendanceCount: attendanceList.memberIds.length
      }))
  }
}
