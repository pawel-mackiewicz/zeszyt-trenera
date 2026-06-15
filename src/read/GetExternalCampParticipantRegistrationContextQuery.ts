import type { TrainerNotebookDb } from '@/db'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type GetExternalCampParticipantRegistrationContextQueryInput = {
  campId: string
}

export type ExternalCampParticipantRegistrationContext = {
  camp: {
    id: string
    name: string
    price: MoneySnapshot
  }
}

export class GetExternalCampParticipantRegistrationContextQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(
    input: GetExternalCampParticipantRegistrationContextQueryInput
  ): Promise<ExternalCampParticipantRegistrationContext | null> {
    const camp = await this.database.camps.get(input.campId)

    if (!camp) {
      return null
    }

    return {
      camp: {
        id: camp.id,
        name: camp.name,
        price: { ...camp.price }
      }
    }
  }
}
