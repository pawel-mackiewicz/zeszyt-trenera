import type { Camp } from '@/write/camps/domain/Camp'

export interface CampRepoPort {
  save(camp: Camp): Promise<void>
}

export class FakeCampRepo implements CampRepoPort {
  public readonly savedCamps: Camp[] = []
  public readonly campsById = new Map<string, Camp>()

  async save(camp: Camp): Promise<void> {
    this.savedCamps.push(camp)
    this.campsById.set(camp.id, camp)
  }
}
