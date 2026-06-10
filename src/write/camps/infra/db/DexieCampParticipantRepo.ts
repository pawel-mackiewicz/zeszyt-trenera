import type { TrainerNotebookDb } from '@/db'
import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type { CampParticipantPerson } from '@/write/camps/domain/CampParticipant'
import type {
  PersistedCampParticipant,
  PersistedCampParticipantDiscount,
  PersistedCampParticipantFinancialTransaction
} from '@/write/shared/infra'
import { Money } from '@/write/shared/vo/Money'

const createCampParticipantPersonKey = (
  person: CampParticipantPerson
): string => {
  if (person.type === 'club') {
    return JSON.stringify(['club', person.memberId])
  }

  return JSON.stringify(['external', person.firstName, person.lastName])
}

export class DexieCampParticipantRepo implements CampParticipantRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(participant: CampParticipant): Promise<void> {
    await this.database.campParticipants.add(
      this.toPersistedCampParticipant(participant)
    )
  }

  public async update(participant: CampParticipant): Promise<void> {
    await this.database.campParticipants.put(
      this.toPersistedCampParticipant(participant)
    )
  }

  public async findById(id: string): Promise<CampParticipant | null> {
    const persistedParticipant = await this.database.campParticipants.get(id)

    if (!persistedParticipant) {
      return null
    }

    return CampParticipant.rehydrate({
      id: persistedParticipant.id,
      campId: persistedParticipant.campId,
      person: persistedParticipant.person,
      status: persistedParticipant.status,
      totalAmountDue: Money.create(persistedParticipant.totalAmountDue),
      discounts: persistedParticipant.discounts.map((discount) => ({
        id: discount.id,
        amount: Money.create(discount.amount),
        reason: discount.reason,
        createdAt: discount.createdAt
      })),
      financialTransactions: persistedParticipant.financialTransactions.map(
        (transaction) => ({
          type: transaction.type,
          id: transaction.id,
          amount: Money.create(transaction.amount),
          note: transaction.note,
          createdAt: transaction.createdAt
        })
      ),
      addedAt: persistedParticipant.addedAt,
      updatedAt: persistedParticipant.updatedAt
    })
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
      id: snapshot.id,
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
