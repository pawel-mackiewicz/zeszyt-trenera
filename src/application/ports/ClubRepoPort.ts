import type { Club } from '@/domain/model/club'

export interface ClubRepoPort {
  save(club: Club): Promise<void>
}
