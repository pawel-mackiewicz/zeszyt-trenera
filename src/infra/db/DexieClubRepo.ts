import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { Club } from '@/domain/model/club'
import type { PersistedClub, TrainerNotebookDb } from '@/infra/db'

export class DexieClubRepo implements ClubRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(club: Club): Promise<void> {
    await this.database.clubs.add(this.toPersistedClub(club))
  }

  private toPersistedClub(club: Club): PersistedClub {
    return {
      id: club.id,
      name: club.name,
      foundingDate: club.foundingDate,
      createdAt: club.createdAt
    }
  }
}
