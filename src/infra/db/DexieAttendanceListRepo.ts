import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { AttendanceList } from '@/domain/model/AttendanceList'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedAttendanceList } from '@/infra'

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

  private toPersistedAttendanceList(
    attendanceList: AttendanceList
  ): PersistedAttendanceList {
    return attendanceList.toSnapshot()
  }
}
