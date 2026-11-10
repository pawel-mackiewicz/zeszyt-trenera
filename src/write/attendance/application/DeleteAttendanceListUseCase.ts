import type { UseCase } from '@/write/shared/UseCase'
import type { AttendanceListRepoPort } from '@/write/attendance/application/ports/AttendanceListRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { DeleteAttendanceListCommand } from '@/write/attendance/application/requests/DeleteAttendanceListCommand'
import { AttendanceListNotFoundError } from '@/write/attendance/domain/AttendanceList'

export class DeleteAttendanceListUseCase implements UseCase<DeleteAttendanceListCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly attendanceListRepo: AttendanceListRepoPort
  ) {}

  public async handle(dto: DeleteAttendanceListCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingAttendanceList = await this.attendanceListRepo.findById(
        dto.attendanceListId
      )

      if (!existingAttendanceList) {
        throw new AttendanceListNotFoundError(dto.attendanceListId)
      }
      await this.attendanceListRepo.delete(existingAttendanceList.id)
    })
  }
}
