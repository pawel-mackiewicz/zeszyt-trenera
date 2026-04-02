import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'

export type SetupStatus =
  | 'checking'
  | 'requires-club'
  | 'requires-trainer'
  | 'ready'

export class ObserveSetupStatusQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  /**
   * Returns the current first-run setup status for the device.
   *
   * Why: the shell needs one reactive setup source of truth so it can unblock the rest of the local-first app only after the required club and trainer records exist.
   */
  public handle(): Observable<SetupStatus> {
    // What: keep startup gating on one live Dexie read. Why: setup should advance immediately after local writes without forcing onboarding screens to coordinate shell state manually.
    return liveQuery(async () => {
      const [clubCount, trainerCount] = await Promise.all([
        this.database.clubs.count(),
        this.database.trainers.count()
      ])

      if (clubCount === 0) {
        // What: block the flow on the club first. Why: the app is configured around a single local club, so the trainer step should never open before that identity exists.
        return 'requires-club'
      }

      if (trainerCount === 0) {
        return 'requires-trainer'
      }

      return 'ready'
    })
  }
}
