import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type RegisterCampParticipantDiscountCommand = {
  campId: string
  participantId: string
  amount: MoneySnapshot
  reason?: string
}
