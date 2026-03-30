import type { AttendanceList } from '@/domain/model/AttendanceList'

export type AttendanceSessionListItem = {
  id: string
  start: Date
  attendanceCount: number
}

export interface AttendanceListRepoPort {
  save(attendanceList: AttendanceList): Promise<void>
  existsByStart(start: Date): Promise<boolean>
  listByStartRange(
    startInclusive: Date,
    startExclusive: Date
  ): Promise<AttendanceSessionListItem[]>
}
