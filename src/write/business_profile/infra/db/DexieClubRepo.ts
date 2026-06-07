import type { ClubRepoPort } from '@/write/business_profile/application/ports/ClubRepoPort'
import type { Club } from '@/write/business_profile/domain/Club'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedClub } from '@/write/shared/infra'

export class DexieClubRepo implements ClubRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(club: Club): Promise<void> {
    await this.database.clubs.add(this.toPersistedClub(club))
  }

  public async exists(): Promise<boolean> {
    // Setup only needs a single-club guard for now, so the repo keeps a narrow existence query instead of premature hydration.
    const persistedClub = await this.database.clubs.toCollection().first()

    return persistedClub != null
  }

  private toPersistedClub(club: Club): PersistedClub {
    return club.toSnapshot()
  }
}
