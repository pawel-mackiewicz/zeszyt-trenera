import type { AttendanceList } from '@/write/attendance/domain/AttendanceList'

export interface AttendanceListRepoPort {
  findById(attendanceListId: string): Promise<AttendanceList | null>
  findIdsByMemberId(memberId: string): Promise<string[]>
  save(attendanceList: AttendanceList): Promise<void>
  update(attendanceList: AttendanceList): Promise<void>
  delete(attendanceListId: string): Promise<void>
  existsByStart(start: Date): Promise<boolean>
}

export class FakeAttendanceListRepo implements AttendanceListRepoPort {
  public readonly savedAttendanceLists: AttendanceList[] = []
  public readonly findByIdChecks: string[] = []
  public readonly updateCalls: AttendanceList[] = []
  public readonly deleteCalls: string[] = []
  public readonly existsByStartChecks: Date[] = []
  public attendanceListsById = new Map<string, AttendanceList>()
  public existingStarts = new Set<number>()
  public readonly idsByMemberId = new Map<string, string[]>()

  async findById(attendanceListId: string): Promise<AttendanceList | null> {
    this.findByIdChecks.push(attendanceListId)

    return this.attendanceListsById.get(attendanceListId) ?? null
  }

  async findIdsByMemberId(memberId: string): Promise<string[]> {
    return this.idsByMemberId.get(memberId) ?? []
  }

  async save(attendanceList: AttendanceList): Promise<void> {
    this.savedAttendanceLists.push(attendanceList)
    this.attendanceListsById.set(attendanceList.id, attendanceList)
  }

  async update(attendanceList: AttendanceList): Promise<void> {
    this.updateCalls.push(attendanceList)
    this.attendanceListsById.set(attendanceList.id, attendanceList)
  }

  async delete(attendanceListId: string): Promise<void> {
    this.deleteCalls.push(attendanceListId)
    this.attendanceListsById.delete(attendanceListId)
  }

  async existsByStart(start: Date): Promise<boolean> {
    this.existsByStartChecks.push(new Date(start.getTime()))

    return (
      this.existingStarts.has(start.getTime()) ||
      [...this.attendanceListsById.values()].some(
        (attendanceList) => attendanceList.start.getTime() === start.getTime()
      ) ||
      this.savedAttendanceLists.some(
        (attendanceList) => attendanceList.start.getTime() === start.getTime()
      )
    )
  }
}
