import type { AttendanceList } from '@/write/domain/model/AttendanceList'

export interface AttendanceListRepoPort {
  findById(attendanceListId: string): Promise<AttendanceList | null>
  findIdsByMemberId(memberId: string): Promise<string[]>
  save(attendanceList: AttendanceList): Promise<void>
  update(attendanceList: AttendanceList): Promise<void>
  delete(attendanceListId: string): Promise<void>
  existsByStart(start: Date): Promise<boolean>
}
