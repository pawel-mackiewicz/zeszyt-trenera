import { NOTEBOOK_BOOTSTRAP_STATES } from '@/application/ports/NotebookBootstrapStatePort'
import type {
  NotebookBootstrapState,
  NotebookBootstrapStatePort
} from '@/application/ports/NotebookBootstrapStatePort'
import type { TrainerNotebookDb } from '@/db'

export class DexieNotebookBootstrapStateRepo implements NotebookBootstrapStatePort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async readBootstrapState(): Promise<NotebookBootstrapState> {
    // Why: demo bootstrap must distinguish a truly empty notebook from incomplete local data so it never overwrites user-owned rows just because setup was interrupted before club/trainer registration.
    const [
      clubCount,
      trainerCount,
      memberCount,
      membershipPaymentCount,
      attendanceListCount,
      eventCount
    ] = await Promise.all([
      this.database.clubs.count(),
      this.database.trainers.count(),
      this.database.members.count(),
      this.database.membershipPayments.count(),
      this.database.attendanceLists.count(),
      this.database.events.count()
    ])

    if (
      clubCount === 0 &&
      trainerCount === 0 &&
      memberCount === 0 &&
      membershipPaymentCount === 0 &&
      attendanceListCount === 0 &&
      eventCount === 0
    ) {
      return NOTEBOOK_BOOTSTRAP_STATES.EMPTY
    }

    // Why: the rest of the shell already treats club-plus-trainer as the threshold for a usable notebook, so bootstrap should only keep an existing demo notebook mounted when that same baseline is present.
    if (clubCount > 0 && trainerCount > 0) {
      return NOTEBOOK_BOOTSTRAP_STATES.SETUP_READY
    }

    return NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
  }
}
