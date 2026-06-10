import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type AcceptCampParticipantResignationCommand = {
  campId: string
  participantId: string
  nonRefundableDepositValue?: MoneySnapshot
  refundedValue?: MoneySnapshot
}
