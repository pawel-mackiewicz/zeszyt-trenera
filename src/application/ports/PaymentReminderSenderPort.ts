export type PaymentReminderSender = {
  clubName: string
  trainerName: string
}

export interface PaymentReminderSenderPort {
  load(): Promise<PaymentReminderSender | null>
}
