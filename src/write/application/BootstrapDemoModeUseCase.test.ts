import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BootstrapDemoModeUseCase } from '@/write/application/BootstrapDemoModeUseCase'
import type { DemoSeedFactoryPort } from '@/write/application/ports/DemoSeedFactoryPort'
import type { DemoLifecycleStorePort } from '@/write/application/ports/DemoLifecycleStorePort'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/write/application/ports/MembershipPaymentRepoPort'
import {
  NOTEBOOK_BOOTSTRAP_STATES,
  type NotebookBootstrapState,
  type NotebookBootstrapStatePort
} from '@/write/application/ports/NotebookBootstrapStatePort'
import type { TrainerRepoPort } from '@/write/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { AppResetRepoPort } from '@/write/application/ports/AppResetRepoPort'
import type { AttendanceListRepoPort } from '@/write/application/ports/AttendanceListRepoPort'
import type { ClockPort } from '@/write/application/ports/ClockPort'
import type { ClubRepoPort } from '@/write/application/ports/ClubRepoPort'
import type { IdGeneratorPort } from '@/write/application/ports/IdGeneratorPort'
import { createDemoSeed } from '@/write/infra/createDemoSeed'

describe('BootstrapDemoModeUseCase', () => {
  let unitOfWork: UnitOfWork
  let appResetRepo: AppResetRepoPort
  let clubRepo: ClubRepoPort
  let trainerRepo: TrainerRepoPort
  let memberRepo: MemberRepoPort
  let membershipPaymentRepo: MembershipPaymentRepoPort
  let attendanceListRepo: AttendanceListRepoPort
  let eventRepo: EventRepoPort
  let notebookBootstrapStateRepo: NotebookBootstrapStatePort
  let idGenerator: IdGeneratorPort
  let demoSeedFactory: DemoSeedFactoryPort
  let clock: ClockPort
  let demoLifecycleStore: DemoLifecycleStorePort

  beforeEach(() => {
    let generatedIdIndex = 0
    let notebookBootstrapState: NotebookBootstrapState =
      NOTEBOOK_BOOTSTRAP_STATES.EMPTY

    unitOfWork = {
      execute: async <T>(action: () => Promise<T>) => await action()
    }
    appResetRepo = {
      clearAllData: vi.fn().mockResolvedValue(undefined)
    }
    notebookBootstrapStateRepo = {
      readBootstrapState: vi.fn(async () => notebookBootstrapState)
    }
    clubRepo = {
      save: vi.fn(async () => {
        if (notebookBootstrapState === NOTEBOOK_BOOTSTRAP_STATES.EMPTY) {
          notebookBootstrapState = NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
        }
      }),
      exists: vi.fn().mockResolvedValue(false)
    }
    trainerRepo = {
      save: vi.fn(async () => {
        notebookBootstrapState = NOTEBOOK_BOOTSTRAP_STATES.SETUP_READY
      }),
      exists: vi.fn().mockResolvedValue(false)
    }
    memberRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      existsById: vi.fn().mockResolvedValue(false),
      existsByNameAndBirthDate: vi.fn().mockResolvedValue(false)
    }
    membershipPaymentRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      existsByMemberIdAndCoveredMonth: vi.fn().mockResolvedValue(false)
    }
    attendanceListRepo = {
      findById: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      existsByStart: vi.fn().mockResolvedValue(false)
    }
    eventRepo = {
      save: vi.fn().mockResolvedValue(undefined)
    }
    idGenerator = {
      generate: vi.fn(() => `generated-id-${generatedIdIndex++}`)
    }
    demoSeedFactory = {
      // Why: unit tests still exercise the production seed behavior while the use case consumes it through the injected application port.
      createSeed: vi.fn((now: Date) => createDemoSeed(now))
    }
    clock = {
      now: vi.fn(() => new Date(2026, 3, 9, 12, 0, 0))
    }
    demoLifecycleStore = {
      readState: vi.fn().mockResolvedValue('uninitialized'),
      writeState: vi.fn().mockResolvedValue(undefined),
      readDemoModeActive: vi.fn().mockResolvedValue(false),
      writeDemoModeActive: vi.fn().mockResolvedValue(undefined)
    }
  })

  it('seeds demo data on the first clean launch and opens the intro modal once', async () => {
    const expectedDemoSeed = createDemoSeed(new Date(2026, 3, 9, 12, 0, 0))
    const useCase = new BootstrapDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      notebookBootstrapStateRepo,
      clubRepo,
      trainerRepo,
      memberRepo,
      membershipPaymentRepo,
      attendanceListRepo,
      eventRepo,
      idGenerator,
      demoSeedFactory,
      clock,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toEqual({
      demoModeActive: true,
      introModal: true
    })
    expect(appResetRepo.clearAllData).toHaveBeenCalledTimes(1)
    expect(clubRepo.save).toHaveBeenCalledTimes(1)
    expect(trainerRepo.save).toHaveBeenCalledTimes(1)
    expect(memberRepo.save).toHaveBeenCalledTimes(60)
    expect(membershipPaymentRepo.save).toHaveBeenCalledTimes(
      expectedDemoSeed.membershipPayments.length
    )
    expect(attendanceListRepo.save).toHaveBeenCalledTimes(
      expectedDemoSeed.attendanceLists.length
    )
    expect(eventRepo.save).toHaveBeenCalledTimes(
      2 +
        expectedDemoSeed.members.length +
        expectedDemoSeed.membershipPayments.length +
        expectedDemoSeed.attendanceLists.length
    )
    expect(demoLifecycleStore.writeState).not.toHaveBeenCalled()
    expect(demoLifecycleStore.writeDemoModeActive).toHaveBeenCalledWith(true)
  })

  it('skips seeding entirely when demo mode was already dismissed on this device', async () => {
    vi.mocked(demoLifecycleStore.readState).mockResolvedValue('dismissed')
    const useCase = new BootstrapDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      notebookBootstrapStateRepo,
      clubRepo,
      trainerRepo,
      memberRepo,
      membershipPaymentRepo,
      attendanceListRepo,
      eventRepo,
      idGenerator,
      demoSeedFactory,
      clock,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toEqual({
      demoModeActive: false,
      introModal: false
    })
    expect(appResetRepo.clearAllData).not.toHaveBeenCalled()
    expect(clubRepo.save).not.toHaveBeenCalled()
    expect(trainerRepo.save).not.toHaveBeenCalled()
    expect(memberRepo.save).not.toHaveBeenCalled()
    expect(demoLifecycleStore.writeState).not.toHaveBeenCalled()
    expect(demoLifecycleStore.writeDemoModeActive).not.toHaveBeenCalled()
  })

  it('keeps demo mode active across refreshes when the seeded notebook is already present', async () => {
    vi.mocked(demoLifecycleStore.readDemoModeActive).mockResolvedValue(true)
    vi.mocked(notebookBootstrapStateRepo.readBootstrapState).mockResolvedValue(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_READY
    )
    const useCase = new BootstrapDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      notebookBootstrapStateRepo,
      clubRepo,
      trainerRepo,
      memberRepo,
      membershipPaymentRepo,
      attendanceListRepo,
      eventRepo,
      idGenerator,
      demoSeedFactory,
      clock,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toEqual({
      demoModeActive: true,
      introModal: false
    })
    expect(appResetRepo.clearAllData).not.toHaveBeenCalled()
    expect(clubRepo.save).not.toHaveBeenCalled()
    expect(trainerRepo.save).not.toHaveBeenCalled()
    expect(demoLifecycleStore.writeState).not.toHaveBeenCalled()
    expect(demoLifecycleStore.writeDemoModeActive).not.toHaveBeenCalled()
  })

  it('repairs an active demo notebook when only part of the seeded data survived', async () => {
    vi.mocked(demoLifecycleStore.readDemoModeActive).mockResolvedValue(true)
    vi.mocked(notebookBootstrapStateRepo.readBootstrapState).mockResolvedValue(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
    )
    const useCase = new BootstrapDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      notebookBootstrapStateRepo,
      clubRepo,
      trainerRepo,
      memberRepo,
      membershipPaymentRepo,
      attendanceListRepo,
      eventRepo,
      idGenerator,
      demoSeedFactory,
      clock,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toEqual({
      demoModeActive: true,
      introModal: false
    })
    expect(appResetRepo.clearAllData).toHaveBeenCalledTimes(1)
    expect(demoLifecycleStore.writeDemoModeActive).toHaveBeenCalledWith(true)
  })

  it('treats orphaned local data as standard mode instead of overwriting it with demo content', async () => {
    vi.mocked(notebookBootstrapStateRepo.readBootstrapState).mockResolvedValue(
      NOTEBOOK_BOOTSTRAP_STATES.SETUP_INCOMPLETE
    )
    const useCase = new BootstrapDemoModeUseCase(
      unitOfWork,
      appResetRepo,
      notebookBootstrapStateRepo,
      clubRepo,
      trainerRepo,
      memberRepo,
      membershipPaymentRepo,
      attendanceListRepo,
      eventRepo,
      idGenerator,
      demoSeedFactory,
      clock,
      demoLifecycleStore
    )

    await expect(useCase.handle({})).resolves.toEqual({
      demoModeActive: false,
      introModal: false
    })
    expect(appResetRepo.clearAllData).not.toHaveBeenCalled()
    expect(clubRepo.save).not.toHaveBeenCalled()
    expect(trainerRepo.save).not.toHaveBeenCalled()
    expect(demoLifecycleStore.writeDemoModeActive).not.toHaveBeenCalled()
  })
})
