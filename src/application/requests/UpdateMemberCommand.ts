// Why: member updates now use birth date as part of canonical identity, so every update command must carry the value explicitly.
export type UpdateMemberCommand = {
  memberId: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth: Date
  joinedAt?: Date
}
