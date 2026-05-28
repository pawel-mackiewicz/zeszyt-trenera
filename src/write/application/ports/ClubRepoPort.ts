import type { Club } from '@/write/domain/model/Club'

export interface ClubRepoPort {
  save(club: Club): Promise<void>
  exists(): Promise<boolean>
}

export class FakeClubRepo implements ClubRepoPort {
  public readonly savedClubs: Club[] = []
  public loadedClub: Club | undefined

  async save(club: Club): Promise<void> {
    this.savedClubs.push(club)
  }

  async exists(): Promise<boolean> {
    return this.loadedClub != null
  }
}
