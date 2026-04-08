export type UpdateMemberCommand = {
  memberId: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth?: Date
  joinedAt?: Date
}
