import type { TrainerNotebookDb } from '@/db'
import type { PersistedCamp } from '@/write/shared/infra'

export type CampListItem = {
  id: string
  name: string
  startDate: Date
  finishDate: Date
}

export type CampListResult = {
  present: CampListItem[]
  past: CampListItem[]
}

export class ListCampsQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async handle(): Promise<CampListResult> {
    const now = new Date()
    const camps = (await this.database.camps.toArray()).map(toCampListItem)

    return {
      present: camps
        .filter((camp) => camp.finishDate >= now)
        .sort(compareBySoonestFinishDate),
      past: camps
        .filter((camp) => camp.finishDate < now)
        .sort(compareByMostRecentFinishDate)
    }
  }
}

function toCampListItem(camp: PersistedCamp): CampListItem {
  return {
    id: camp.id,
    name: camp.name,
    startDate: new Date(camp.startDate),
    finishDate: new Date(camp.finishDate)
  }
}

function compareBySoonestFinishDate(left: CampListItem, right: CampListItem) {
  return (
    left.finishDate.getTime() - right.finishDate.getTime() ||
    left.name.localeCompare(right.name)
  )
}

function compareByMostRecentFinishDate(
  left: CampListItem,
  right: CampListItem
) {
  return compareBySoonestFinishDate(right, left)
}
