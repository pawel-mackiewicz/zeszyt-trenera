import type { TrainerNotebookDb } from '@/db'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type GetClubCampParticipantRegistrationContextQueryInput = {
  campId: string
  memberId: string
}

export type ClubCampParticipantRegistrationContext = {
  camp: {
    id: string
    name: string
    price: MoneySnapshot
  }
  member: {
    id: string
    firstName: string
    lastName: string
  }
}

export class GetClubCampParticipantRegistrationContextQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(
    input: GetClubCampParticipantRegistrationContextQueryInput
  ): Promise<ClubCampParticipantRegistrationContext | null> {
    const [camp, member] = await Promise.all([
      this.database.camps.get(input.campId),
      this.database.members.get(input.memberId)
    ])

    if (!camp || !member || member.archived === true) {
      return null
    }

    return {
      camp: {
        id: camp.id,
        name: camp.name,
        price: { ...camp.price }
      },
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName
      }
    }
  }
}
