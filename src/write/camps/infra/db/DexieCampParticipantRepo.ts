import type { TrainerNotebookDb } from '@/db'
import {
  createCampParticipantIdentityKey,
  createCampParticipantPersonKey,
  type CampParticipantRepoPort
} from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type {
  PersistedCampParticipant,
  PersistedCampParticipantDiscount,
  PersistedCampParticipantFinancialTransaction
} from '@/write/shared/infra'

export class DexieCampParticipantRepo implements CampParticipantRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(participant: CampParticipant): Promise<void> {
    await this.database.campParticipants.add(
      this.toPersistedCampParticipant(participant)
    )
  }

  public async existsByCampIdAndPerson(
    campId: string,
    person: CampParticipant['person']
  ): Promise<boolean> {
    const persistedParticipant = await this.database.campParticipants
      .where('[campId+personKey]')
      .equals([campId, createCampParticipantPersonKey(person)])
      .first()

    return persistedParticipant != null
  }

  private toPersistedCampParticipant(
    participant: CampParticipant
  ): PersistedCampParticipant {
    const snapshot = participant.toSnapshot()

    return {
      id: createCampParticipantIdentityKey(snapshot.campId, snapshot.person),
      campId: snapshot.campId,
      personKey: createCampParticipantPersonKey(snapshot.person),
      person: snapshot.person,
      status: snapshot.status,
      totalAmountDue: snapshot.totalAmountDue.toSnapshot(),
      discounts: snapshot.discounts.map(
        (discount): PersistedCampParticipantDiscount => ({
          id: discount.id,
          amount: discount.amount.toSnapshot(),
          reason: discount.reason,
          createdAt: discount.createdAt
        })
      ),
      financialTransactions: snapshot.financialTransactions.map(
        (transaction): PersistedCampParticipantFinancialTransaction => ({
          type: transaction.type,
          id: transaction.id,
          amount: transaction.amount.toSnapshot(),
          note: transaction.note,
          createdAt: transaction.createdAt
        })
      ),
      addedAt: snapshot.addedAt,
      updatedAt: snapshot.updatedAt
    }
  }
}
