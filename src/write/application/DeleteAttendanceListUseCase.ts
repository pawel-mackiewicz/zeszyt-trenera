import type { UseCase } from '@/write/application/UseCase'
import type { AttendanceListRepoPort } from '@/write/application/ports/AttendanceListRepoPort'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { DeleteAttendanceListCommand } from '@/write/application/requests/DeleteAttendanceListCommand'
import {
  AttendanceList,
  AttendanceListNotFoundError
} from '@/write/domain/model/AttendanceList'

export class DeleteAttendanceListUseCase implements UseCase<DeleteAttendanceListCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly attendanceListRepo: AttendanceListRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: DeleteAttendanceListCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingAttendanceList = await this.attendanceListRepo.findById(
        dto.attendanceListId
      )

      if (!existingAttendanceList) {
        throw new AttendanceListNotFoundError(dto.attendanceListId)
      }

      const deletedEvent = AttendanceList.delete(existingAttendanceList)

      // Why: the tombstone event and row removal must commit together so local-first history never loses the reason a saved session disappeared.
      await this.eventRepo.save(deletedEvent)
      await this.attendanceListRepo.delete(existingAttendanceList.id)
    })
  }
}
