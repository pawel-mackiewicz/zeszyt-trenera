export type BuildPaymentReminderMessageInput = {
  clubName: string
  coveredMonth: string
  locale: string
  trainerName: string
}

export interface PaymentReminderMessageBuilderPort {
  build(input: BuildPaymentReminderMessageInput): string
}
