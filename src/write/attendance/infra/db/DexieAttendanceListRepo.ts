import type { AttendanceListRepoPort } from '@/write/attendance/application/ports/AttendanceListRepoPort'
import {
  AttendanceList,
  type AttendanceListSnapshot
} from '@/write/attendance/domain/AttendanceList'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedAttendanceList } from '@/write/shared/infra'

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

  public async findIdsByMemberId(memberId: string): Promise<string[]> {
    const attendanceListIds = await this.database.attendanceLists
      .where('memberIds')
      .equals(memberId)
      .primaryKeys()

    return attendanceListIds
      .map(String)
      .sort((left, right) => left.localeCompare(right))
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

  public async delete(attendanceListId: string): Promise<void> {
    // Why: deleting by primary key lets the application workflow remove even non-empty local sessions without loading unrelated attendance rows on mobile.
    await this.database.attendanceLists.delete(attendanceListId)
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
