import type { Club } from '@/write/domain/model/Club'

export interface ClubRepoPort {
  save(club: Club): Promise<void>
  exists(): Promise<boolean>
}
