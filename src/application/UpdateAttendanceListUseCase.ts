import type { UseCase } from '@/application/UseCase'
import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { UpdateAttendanceListCommand } from '@/application/requests/UpdateAttendanceListCommand'
import {
  AttendanceList,
  AttendanceListAlreadyExistsError,
  AttendanceListNotFoundError
} from '@/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/domain/model/Member'

export class UpdateAttendanceListUseCase implements UseCase<UpdateAttendanceListCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly attendanceListRepo: AttendanceListRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: UpdateAttendanceListCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingAttendanceList = await this.attendanceListRepo.findById(
        dto.attendanceListId
      )

      if (!existingAttendanceList) {
        throw new AttendanceListNotFoundError(dto.attendanceListId)
      }

      // Why: editing must keep the same offline uniqueness rule as creation, but the current session should be allowed to keep its original start.
      await this.ensureChangedStartDoesNotExist(
        existingAttendanceList,
        dto.start
      )
      await this.ensureMembersExist(dto.memberIds)

      const [updatedAttendanceList, updatedEvent] = AttendanceList.update(
        existingAttendanceList,
        dto
      )

      await this.eventRepo.save(updatedEvent)
      await this.attendanceListRepo.update(updatedAttendanceList)
    })
  }

  private async ensureChangedStartDoesNotExist(
    existingAttendanceList: AttendanceList,
    start: Date
  ): Promise<void> {
    if (existingAttendanceList.start.getTime() === start.getTime()) {
      return
    }

    if (await this.attendanceListRepo.existsByStart(start)) {
      throw new AttendanceListAlreadyExistsError(start)
    }
  }

  private async ensureMembersExist(memberIds: string[]): Promise<void> {
    // Why: attendance updates still store member ids by reference, so the write must fail before persistence if the local roster changed underneath the editor.
    for (const memberId of memberIds) {
      if (!(await this.memberRepo.existsById(memberId))) {
        throw new MemberNotFoundError(memberId)
      }
    }
  }
}
