import type { UseCase } from '@/write/application/UseCase'
import type { AppResetRepoPort } from '@/write/application/ports/AppResetRepoPort'
import type { DemoLifecycleStorePort } from '@/write/application/ports/DemoLifecycleStorePort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { LeaveDemoModeCommand } from '@/write/application/requests/LeaveDemoModeCommand'

export class LeaveDemoModeUseCase implements UseCase<LeaveDemoModeCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly appResetRepo: AppResetRepoPort,
    private readonly demoLifecycleStore: DemoLifecycleStorePort
  ) {}

  public async handle(request: LeaveDemoModeCommand): Promise<void> {
    void request

    await this.unitOfWork.execute(async () => {
      // Why: leaving demo mode must wipe the seeded notebook atomically so the app never lands in a mixed demo-and-real state on a mobile restart.
      await this.appResetRepo.clearAllData()
    })

    // Why: the "do not auto-seed again" choice has to survive the database wipe itself, so the lifecycle flag lives outside Dexie and is written only after the local notebook is clean.
    await this.demoLifecycleStore.writeState('dismissed')
    // Why: removing the active-demo marker after the dismissal write keeps refreshed shells from reopening demo chrome if storage writes partially fail on a flaky mobile browser.
    await this.demoLifecycleStore.writeDemoModeActive(false)
  }
}
