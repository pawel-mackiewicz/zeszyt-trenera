import type { CampParticipantPerson } from '@/write/camps/domain/CampParticipant'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type InitialCampParticipantDiscountCommand = {
  amount: MoneySnapshot
  reason?: string
}

export type InitialCampParticipantPaymentCommand = {
  amount: MoneySnapshot
  note?: string
}

export type RegisterCampParticipantCommand = {
  campId: string
  person: CampParticipantPerson
  totalAmountDue: MoneySnapshot
  initialDiscount?: InitialCampParticipantDiscountCommand
  initialPayment?: InitialCampParticipantPaymentCommand
}
