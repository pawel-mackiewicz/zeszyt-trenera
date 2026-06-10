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

const areSameParticipantPerson = (
  left: CampParticipantPerson,
  right: CampParticipantPerson
): boolean => {
  if (left.type !== right.type) {
    return false
  }

  if (left.type === 'club' && right.type === 'club') {
    return left.memberId === right.memberId
  }

  if (left.type === 'external' && right.type === 'external') {
    return (
      left.firstName === right.firstName && left.lastName === right.lastName
    )
  }

  return false
}

const isExistingParticipant = (
  campId: string,
  person: CampParticipantPerson,
  participant: {
    campId: string
    person: CampParticipantPerson
  }
): boolean =>
  campId === participant.campId &&
  areSameParticipantPerson(person, participant.person)

export class FakeCampParticipantRepo implements CampParticipantRepoPort {
  public readonly savedParticipants: CampParticipant[] = []
  public readonly existsChecks: Array<{
    campId: string
    person: CampParticipantPerson
  }> = []

  private readonly existingParticipants: Array<{
    campId: string
    person: CampParticipantPerson
  }> = []

  public addExistingParticipant(
    campId: string,
    person: CampParticipantPerson
  ): void {
    this.existingParticipants.push({
      campId,
      person
    })
  }

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

    return (
      this.existingParticipants.some((participant) =>
        isExistingParticipant(campId, person, participant)
      ) ||
      this.savedParticipants.some((participant) =>
        isExistingParticipant(campId, person, participant)
      )
    )
  }
}
