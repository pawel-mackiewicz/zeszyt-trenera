export type RegisterMemberCommand = {
  firstName: string
  lastName: string
  phoneNumber?: string | null
  dateOfBirth: Date
  joinedAt?: Date
}
