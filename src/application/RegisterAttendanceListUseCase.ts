import type { UseCase } from '@/application/UseCase'
import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterAttendanceListCommand } from '@/application/requests/RegisterAttendanceListCommand'
import {
  AttendanceList,
  AttendanceListAlreadyExistsError
} from '@/domain/model/AttendanceList'
import { MemberNotFoundError } from '@/domain/model/member'

export class RegisterAttendanceListUseCase implements UseCase<RegisterAttendanceListCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly attendanceListRepo: AttendanceListRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterAttendanceListCommand): Promise<void> {
    await this.uow.execute(async () => {
      // The uniqueness and member guards must share one transaction with the writes so offline double-submits cannot interleave two lists for the same training start.
      await this.ensureAttendanceListDoesNotExist(dto.start)
      await this.ensureMembersExist(dto.memberIds)

      const [attendanceList, event] = this.recordAttendanceList(dto)

      await this.attendanceListRepo.save(attendanceList)
      await this.eventRepo.save(event)
    })
  }

  private async ensureAttendanceListDoesNotExist(start: Date): Promise<void> {
    if (await this.attendanceListRepo.existsByStart(start)) {
      throw new AttendanceListAlreadyExistsError(start)
    }
  }

  private async ensureMembersExist(memberIds: string[]): Promise<void> {
    // Empty attendance is valid because a coach may create tomorrow's session before any member checks in.
    for (const memberId of memberIds) {
      if (!(await this.memberRepo.existsById(memberId))) {
        throw new MemberNotFoundError(memberId)
      }
    }
  }

  private recordAttendanceList(dto: RegisterAttendanceListCommand) {
    // The workflow owns ID allocation so the aggregate stays deterministic in tests and the event log stores the same immutable snapshot as persistence.
    return AttendanceList.record(
      {
        memberIds: dto.memberIds,
        start: dto.start
      },
      this.idGenerator.generate()
    )
  }
}
