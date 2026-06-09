import type {
  CampParticipant,
  CampParticipantPerson
} from '@/write/camps/domain/CampParticipant'

export interface CampParticipantRepoPort {
  save(participant: CampParticipant): Promise<void>
  existsByCampIdAndPerson(
    campId: string,
    person: CampParticipantPerson
  ): Promise<boolean>
}

export const createCampParticipantPersonKey = (
  person: CampParticipantPerson
): string => {
  if (person.type === 'club') {
    return JSON.stringify(['club', person.memberId])
  }

  return JSON.stringify(['external', person.firstName, person.lastName])
}

export const createCampParticipantIdentityKey = (
  campId: string,
  person: CampParticipantPerson
): string => JSON.stringify([campId, createCampParticipantPersonKey(person)])

export class FakeCampParticipantRepo implements CampParticipantRepoPort {
  public readonly savedParticipants: CampParticipant[] = []
  public readonly existingKeys = new Set<string>()
  public readonly existsChecks: Array<{
    campId: string
    person: CampParticipantPerson
  }> = []

  async save(participant: CampParticipant): Promise<void> {
    this.savedParticipants.push(participant)
  }

  async existsByCampIdAndPerson(
    campId: string,
    person: CampParticipantPerson
  ): Promise<boolean> {
    this.existsChecks.push({
      campId,
      person
    })

    const identityKey = createCampParticipantIdentityKey(campId, person)

    return (
      this.existingKeys.has(identityKey) ||
      this.savedParticipants.some(
        (participant) =>
          createCampParticipantIdentityKey(
            participant.campId,
            participant.person
          ) === identityKey
      )
    )
  }
}
