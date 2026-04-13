import type { Club } from '@/domain/model/Club'

export interface ClubRepoPort {
  save(club: Club): Promise<void>
  exists(): Promise<boolean>
}
