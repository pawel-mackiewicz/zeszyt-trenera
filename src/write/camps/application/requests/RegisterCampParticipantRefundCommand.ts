import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type RegisterCampParticipantRefundCommand = {
  campId: string
  participantId: string
  amount: MoneySnapshot
  note?: string
}
