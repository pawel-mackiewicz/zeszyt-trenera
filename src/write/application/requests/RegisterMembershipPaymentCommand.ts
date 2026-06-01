import type { MoneySnapshot } from '@/write/domain/model/vo/Money'

export type RegisterMembershipPaymentCommand = {
  memberId: string
  coveredMonth: string
  chargedAmount: MoneySnapshot
}
