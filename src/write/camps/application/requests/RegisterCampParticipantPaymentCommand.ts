import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type RegisterCampParticipantPaymentCommand = {
  campId: string
  participantId: string
  amount: MoneySnapshot
  note?: string
}
