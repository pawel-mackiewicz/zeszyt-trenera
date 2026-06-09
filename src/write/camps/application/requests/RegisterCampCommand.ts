import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type RegisterCampCommand = {
  name: string
  note?: string
  startDate: Date
  price: MoneySnapshot
}
