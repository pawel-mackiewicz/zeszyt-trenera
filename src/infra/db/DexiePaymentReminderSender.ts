import type {
  PaymentReminderSender,
  PaymentReminderSenderPort
} from '@/application/ports/PaymentReminderSenderPort'
import type { TrainerNotebookDb } from '@/db'

export class DexiePaymentReminderSender implements PaymentReminderSenderPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async load(): Promise<PaymentReminderSender | null> {
    const [persistedClub, persistedTrainer] = await Promise.all([
      this.database.clubs.toCollection().first(),
      this.database.trainers.toCollection().first()
    ])

    if (persistedClub == null || persistedTrainer == null) {
      return null
    }

    // Why: payment reminders should reuse the same local setup identity that powers the rest of the app, so sender fields come from the persisted singleton club and trainer records.
    return {
      clubName: persistedClub.name,
      trainerName: persistedTrainer.name
    }
  }
}
