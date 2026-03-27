import type { AttendanceList } from '@/domain/model/AttendanceList'

export interface AttendanceListRepoPort {
  save(attendanceList: AttendanceList): Promise<void>
  existsByStart(start: Date): Promise<boolean>
}
