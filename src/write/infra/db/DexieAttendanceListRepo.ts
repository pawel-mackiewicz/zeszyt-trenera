import type { AttendanceListRepoPort } from '@/write/application/ports/AttendanceListRepoPort'
import {
  AttendanceList,
  type AttendanceListSnapshot
} from '@/write/domain/model/AttendanceList'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedAttendanceList } from '@/write/infra'

export class DexieAttendanceListRepo implements AttendanceListRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async findById(
    attendanceListId: string
  ): Promise<AttendanceList | null> {
    const persistedAttendanceList =
      await this.database.attendanceLists.get(attendanceListId)

    if (!persistedAttendanceList) {
      return null
    }

    return AttendanceList.rehydrate(
      this.toAttendanceListSnapshot(persistedAttendanceList)
    )
  }

  public async save(attendanceList: AttendanceList): Promise<void> {
    await this.database.attendanceLists.add(
      this.toPersistedAttendanceList(attendanceList)
    )
  }

  public async update(attendanceList: AttendanceList): Promise<void> {
    await this.database.attendanceLists.put(
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

  private toAttendanceListSnapshot(
    attendanceList: PersistedAttendanceList
  ): AttendanceListSnapshot {
    return {
      id: attendanceList.id,
      memberIds: [...attendanceList.memberIds],
      start: new Date(attendanceList.start.getTime()),
      createdAt: new Date(attendanceList.createdAt.getTime())
    }
  }
}
