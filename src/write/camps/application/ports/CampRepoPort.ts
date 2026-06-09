import type { Camp } from '@/write/camps/domain/Camp'

export interface CampRepoPort {
  save(camp: Camp): Promise<void>
  existsById(campId: string): Promise<boolean>
}

export class FakeCampRepo implements CampRepoPort {
  public readonly savedCamps: Camp[] = []
  public readonly campsById = new Map<string, Camp>()
  public readonly existingCampIds = new Set<string>()

  async save(camp: Camp): Promise<void> {
    this.savedCamps.push(camp)
    this.campsById.set(camp.id, camp)
  }

  async existsById(campId: string): Promise<boolean> {
    return this.existingCampIds.has(campId) || this.campsById.has(campId)
  }
}
