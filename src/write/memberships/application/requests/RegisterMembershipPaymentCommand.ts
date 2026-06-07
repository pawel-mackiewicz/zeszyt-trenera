import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type RegisterMembershipPaymentCommand = {
  memberId: string
  coveredMonth: string
  chargedAmount: MoneySnapshot
}
