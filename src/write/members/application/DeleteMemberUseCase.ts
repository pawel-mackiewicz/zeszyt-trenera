import type { UseCase } from '@/write/shared/UseCase'
import type { AttendanceListRepoPort } from '@/write/attendance/application/ports/AttendanceListRepoPort'
import type { MemberRepoPort } from '@/write/members/application/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { DeleteMemberCommand } from '@/write/members/application/requests/DeleteMemberCommand'
import { MemberNotFoundError } from '@/write/members/domain/Member'

export type DeleteMemberResult = {
  membershipPaymentIds: string[]
  attendanceListIds: string[]
  deleted: boolean
}

//to make result deterministic
const sorted = (ids: string[]): string[] =>
  [...ids].sort((left, right) => left.localeCompare(right))

export class DeleteMemberUseCase implements UseCase<
  DeleteMemberCommand,
  DeleteMemberResult
> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly membershipPaymentRepo: MembershipPaymentRepoPort,
    private readonly attendanceListRepo: AttendanceListRepoPort
  ) {}

  public async handle(dto: DeleteMemberCommand): Promise<DeleteMemberResult> {
    return this.uow.execute(async () => {
      const existingMember = await this.memberRepo.findById(dto.memberId)

      if (!existingMember) {
        throw new MemberNotFoundError(dto.memberId)
      }

      const membershipPaymentIds = sorted(
        await this.membershipPaymentRepo.findIdsByMemberId(dto.memberId)
      )
      const attendanceListIds = sorted(
        await this.attendanceListRepo.findIdsByMemberId(dto.memberId)
      )

      if (membershipPaymentIds.length > 0 || attendanceListIds.length > 0) {
        return {
          membershipPaymentIds,
          attendanceListIds,
          deleted: false
        }
      }
      await this.memberRepo.delete(existingMember.id)

      return {
        membershipPaymentIds: [],
        attendanceListIds: [],
        deleted: true
      }
    })
  }
}
