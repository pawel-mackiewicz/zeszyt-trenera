import type {
  AttendanceListRepoPort,
  AttendanceSessionListItem
} from '@/application/ports/AttendanceListRepoPort'

export type ListAttendanceSessionsByMonthQueryInput = {
  monthStart: Date
  nextMonthStart: Date
}

export class ListAttendanceSessionsByMonthQuery {
  public constructor(
    private readonly attendanceListRepo: AttendanceListRepoPort
  ) {}

  public async handle({
    monthStart,
    nextMonthStart
  }: ListAttendanceSessionsByMonthQueryInput): Promise<
    AttendanceSessionListItem[]
  > {
    // The query keeps month boundaries in the application layer so UI screens can ask for one calendar period without learning persistence-specific range semantics.
    return this.attendanceListRepo.listByStartRange(monthStart, nextMonthStart)
  }
}
