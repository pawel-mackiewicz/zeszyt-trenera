import type { AttendanceList } from '@/domain/model/AttendanceList'

export interface AttendanceListRepoPort {
  findById(attendanceListId: string): Promise<AttendanceList | null>
  save(attendanceList: AttendanceList): Promise<void>
  update(attendanceList: AttendanceList): Promise<void>
  existsByStart(start: Date): Promise<boolean>
}
