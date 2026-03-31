import type {
  AttendanceListRepoPort,
  AttendanceSessionListItem
} from '@/application/ports/AttendanceListRepoPort'
import type { AttendanceList } from '@/domain/model/AttendanceList'
import type { PersistedAttendanceList, TrainerNotebookDb } from '@/db'

export class DexieAttendanceListRepo implements AttendanceListRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(attendanceList: AttendanceList): Promise<void> {
    await this.database.attendanceLists.add(
      this.toPersistedAttendanceList(attendanceList)
    )
  }

  public async existsByStart(start: Date): Promise<boolean> {
    // Attendance checks key off the training start, so the adapter uses one indexed lookup instead of loading all local sessions.
    const persistedAttendanceList = await this.database.attendanceLists
      .where('start')
      .equals(start)
      .first()

    return persistedAttendanceList != null
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

  private toPersistedAttendanceList(
    attendanceList: AttendanceList
  ): PersistedAttendanceList {
    return attendanceList.toSnapshot()
  }
}
