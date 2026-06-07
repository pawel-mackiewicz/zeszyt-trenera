import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Observable } from 'dexie'
import { exportDB } from 'dexie-export-import'

import {
  APP_LOCALE_STORAGE_KEY,
  ATTENDANCE_DRAFT_STORAGE_KEY,
  DEMO_LIFECYCLE_STORAGE_KEY,
  DEMO_MODE_ACTIVE_STORAGE_KEY,
  INSTALL_MODAL_SHOWN_STORAGE_KEY
} from '@/appStorageKeys'
import {
  AttendanceListAlreadyExistsError,
  type AttendanceListSnapshot
} from '@/write/attendance/domain/AttendanceList'
import {
  ClubAlreadyExistsError,
  type ClubSnapshot
} from '@/write/business_profile/domain/Club'
import {
  MembershipPaymentAlreadyExistsError,
  type MembershipPaymentSnapshot
} from '@/write/memberships/domain/MembershipPayment'
import {
  type MemberSnapshot,
  MemberAlreadyExistsError,
  MemberNotFoundError
} from '@/write/members/domain/Member'
import {
  TrainerAlreadyExistsError,
  type TrainerSnapshot
} from '@/write/business_profile/domain/Trainer'
import { createAppServices } from '@/appServices'
import { createDemoSeed } from '@/system_management/demo/infra/seed/createDemoSeed.ts'
import type { PersistedDomainEvent } from '@/write/shared/infra'
import { TrainerNotebookDb } from '@/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

function createBirthDate(rawBirthDate: string) {
  return new Date(rawBirthDate)
}

describe('appServices', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
    database = new TrainerNotebookDb(createTestDbName('register-club'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    window.localStorage.clear()
    database.close()
    await database.delete()
  })

  it('reuses the same workflow and database handle inside one services bag', () => {
    const services = createAppServices(database)

    // Reusing one workflow instance keeps writes deterministic while the app resolves the same workflow from different UI entry points.
    expect(services.database).toBe(database)
    expect(services.queries.listAttendanceSessionsByMonth).toBe(
      services.queries.listAttendanceSessionsByMonth
    )
    expect(services.queries.listMembersForAttendanceEditor).toBe(
      services.queries.listMembersForAttendanceEditor
    )
    expect(services.queries.observeMembersForRoster).toBe(
      services.queries.observeMembersForRoster
    )
    expect(services.queries.getAttendanceSessionById).toBe(
      services.queries.getAttendanceSessionById
    )
    expect(services.queries.observeMembershipPaymentStatusByMonth).toBe(
      services.queries.observeMembershipPaymentStatusByMonth
    )
    expect(services.queries.observeMembershipPaymentSummaryByMonth).toBe(
      services.queries.observeMembershipPaymentSummaryByMonth
    )
    expect(services.queries.observeSetupStatus).toBe(
      services.queries.observeSetupStatus
    )
    expect(services.useCases.bootstrapDemoMode).toBe(
      services.useCases.bootstrapDemoMode
    )
    expect(services.useCases.deleteAttendanceList).toBe(
      services.useCases.deleteAttendanceList
    )
    expect(services.useCases.deleteMembershipPayment).toBe(
      services.useCases.deleteMembershipPayment
    )
    expect(services.useCases.exportDatabaseBackup).toBe(
      services.useCases.exportDatabaseBackup
    )
    expect(services.useCases.importDatabaseBackup).toBe(
      services.useCases.importDatabaseBackup
    )
    expect(services.useCases.leaveDemoMode).toBe(
      services.useCases.leaveDemoMode
    )
    expect(services.useCases.registerAttendanceList).toBe(
      services.useCases.registerAttendanceList
    )
    expect(services.useCases.registerClub).toBe(services.useCases.registerClub)
    expect(services.useCases.registerMember).toBe(
      services.useCases.registerMember
    )
    expect(services.useCases.registerMembershipPayment).toBe(
      services.useCases.registerMembershipPayment
    )
    expect(services.useCases.registerTrainer).toBe(
      services.useCases.registerTrainer
    )
    expect(services.useCases.resetApplicationData).toBe(
      services.useCases.resetApplicationData
    )
    expect(services.useCases.sendMembershipPaymentReminder).toBe(
      services.useCases.sendMembershipPaymentReminder
    )
    expect(services.useCases.updateAttendanceList).toBe(
      services.useCases.updateAttendanceList
    )
    expect(services.useCases.updateMember).toBe(services.useCases.updateMember)
  })

  it('assembles the app reset workflow that clears persisted data and app-owned browser state', async () => {
    const services = createAppServices(database)

    await services.useCases.registerClub.handle({
      clubName: 'Reset Club',
      foundingDate: new Date('2001-01-01T00:00:00Z')
    })
    await services.useCases.registerTrainer.handle({
      trainerName: 'Reset Trainer'
    })
    await services.useCases.registerMember.handle({
      firstName: 'Reset',
      lastName: 'Member',
      phoneNumber: '+48 555 444 333',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    const persistedMember = (await database.members.toArray())[0]

    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMember.id,
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 160_00,
        currency: 'PLN'
      }
    })
    await services.useCases.registerAttendanceList.handle({
      memberIds: [persistedMember.id],
      start: new Date('2026-03-30T18:00:00Z')
    })
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'en')
    window.localStorage.setItem(INSTALL_MODAL_SHOWN_STORAGE_KEY, '1')
    window.localStorage.setItem(DEMO_LIFECYCLE_STORAGE_KEY, 'dismissed')
    window.localStorage.setItem(DEMO_MODE_ACTIVE_STORAGE_KEY, '1')
    window.localStorage.setItem(
      ATTENDANCE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sessionDate: '2026-03-30',
        sessionTime: '18:00',
        selectedMemberIds: [persistedMember.id]
      })
    )

    await services.useCases.resetApplicationData.handle({
      confirmationPhrase: 'DELETE ALL DATA'
    })

    await expect(database.clubs.count()).resolves.toBe(0)
    await expect(database.trainers.count()).resolves.toBe(0)
    await expect(database.members.count()).resolves.toBe(0)
    await expect(database.membershipPayments.count()).resolves.toBe(0)
    await expect(database.attendanceLists.count()).resolves.toBe(0)
    await expect(database.events.count()).resolves.toBe(0)
    expect(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBeNull()
    expect(
      window.localStorage.getItem(INSTALL_MODAL_SHOWN_STORAGE_KEY)
    ).toBeNull()
    expect(window.localStorage.getItem(DEMO_LIFECYCLE_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(DEMO_MODE_ACTIVE_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(ATTENDANCE_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('assembles the backup import workflow that overwrites existing local rows', async () => {
    const services = createAppServices(database)
    await services.useCases.registerClub.handle({
      clubName: 'Imported Club',
      foundingDate: new Date('2002-01-01T00:00:00Z')
    })
    await services.useCases.registerTrainer.handle({
      trainerName: 'Imported Trainer'
    })

    const backupBlob = await exportDB(database)
    const backupFile = new File([backupBlob], 'backup.json', {
      type: 'application/json'
    })

    await services.useCases.resetApplicationData.handle({
      confirmationPhrase: 'DELETE ALL DATA'
    })

    await services.useCases.registerClub.handle({
      clubName: 'Local Club',
      foundingDate: new Date('1999-01-01T00:00:00Z')
    })

    await services.useCases.importDatabaseBackup.handle({
      backupFile
    })

    await expect(database.clubs.toArray()).resolves.toMatchObject([
      {
        name: 'Imported Club'
      }
    ])
    await expect(database.trainers.toArray()).resolves.toMatchObject([
      {
        name: 'Imported Trainer'
      }
    ])
  })

  it('assembles Dexie adapters that persist a club and matching event row', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerClub

    await useCase.handle({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })

    const persistedClubs = await database.clubs.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedClub = persistedClubs[0]
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<ClubSnapshot>

    expect(persistedClubs).toHaveLength(1)
    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'club.created',
      // Raw snapshot payloads keep the event log aligned with aggregate restore input so replay code does not have to unwrap adapter-specific keys.
      payload: {
        id: persistedClub.id,
        name: persistedClub.name,
        foundingDate: persistedClub.foundingDate,
        createdAt: persistedClub.createdAt
      }
    })
  })

  it('assembles Dexie adapters that persist an attendance list and matching event row', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+48 987 654 321',
      dateOfBirth: createBirthDate('2011-01-01T00:00:00Z')
    })

    const persistedMembers = await database.members.toArray()
    const start = new Date('2026-03-27T18:00:00Z')

    await services.useCases.registerAttendanceList.handle({
      memberIds: persistedMembers.map((member) => member.id),
      start
    })

    const persistedAttendanceLists = await database.attendanceLists.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedAttendanceList = persistedAttendanceLists[0]
    const persistedEvent = persistedEvents.find(
      (event) => event.eventName === 'attendance-list.recorded'
    ) as PersistedDomainEvent<AttendanceListSnapshot> | undefined

    expect(persistedAttendanceLists).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'attendance-list.recorded',
      // The event payload mirrors the stored snapshot so offline replay can rebuild attendance sessions without adapter-specific mapping.
      payload: {
        id: persistedAttendanceList.id,
        memberIds: persistedAttendanceList.memberIds,
        start: persistedAttendanceList.start,
        createdAt: persistedAttendanceList.createdAt
      }
    })
  })

  it('assembles the attendance deletion workflow for non-empty lists and matching event rows', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    const persistedMember = (await database.members.toArray())[0]
    const start = new Date('2026-03-27T18:00:00Z')

    await services.useCases.registerAttendanceList.handle({
      memberIds: [persistedMember.id],
      start
    })

    const persistedAttendanceList = (
      await database.attendanceLists.toArray()
    )[0]

    await services.useCases.deleteAttendanceList.handle({
      attendanceListId: persistedAttendanceList.id
    })

    const persistedEvents = await database.events.toArray()
    const deletedEvent = persistedEvents.find(
      (event) => event.eventName === 'attendance-list.deleted'
    ) as PersistedDomainEvent<AttendanceListSnapshot> | undefined

    await expect(database.attendanceLists.toArray()).resolves.toEqual([])
    expect(deletedEvent).toMatchObject({
      eventName: 'attendance-list.deleted',
      // Deleted attendance events keep the removed snapshot because the Dexie row is intentionally unavailable after this workflow commits.
      payload: {
        id: persistedAttendanceList.id,
        memberIds: [persistedMember.id],
        start,
        createdAt: persistedAttendanceList.createdAt
      }
    })
  })

  it('assembles the month attendance query on top of the Dexie repo adapters', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+48 987 654 321',
      dateOfBirth: createBirthDate('2011-01-01T00:00:00Z')
    })

    const persistedMembers = await database.members.toArray()

    await services.useCases.registerAttendanceList.handle({
      memberIds: [persistedMembers[0].id],
      start: new Date('2026-03-05T08:00:00Z')
    })
    await services.useCases.registerAttendanceList.handle({
      memberIds: persistedMembers.map((member) => member.id),
      start: new Date('2026-03-27T18:00:00Z')
    })
    await services.useCases.registerAttendanceList.handle({
      memberIds: [persistedMembers[0].id],
      start: new Date('2026-02-02T18:00:00Z')
    })

    await expect(
      services.queries.listAttendanceSessionsByMonth.handle({
        month: new Date('2026-03-16T12:00:00Z')
      })
    ).resolves.toEqual([
      {
        id: expect.any(String),
        start: new Date('2026-03-27T18:00:00Z'),
        attendanceCount: 2
      },
      {
        id: expect.any(String),
        start: new Date('2026-03-05T08:00:00Z'),
        attendanceCount: 1
      }
    ])
  })

  it('assembles the attendance edit workflow and session-by-id query on top of the Dexie adapters', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+48 987 654 321',
      dateOfBirth: createBirthDate('2011-01-01T00:00:00Z')
    })

    const persistedMembers = await database.members.toArray()

    await services.useCases.registerAttendanceList.handle({
      memberIds: [persistedMembers[0].id],
      start: new Date('2026-03-27T18:00:00Z')
    })

    const persistedAttendanceList = (
      await database.attendanceLists.toArray()
    )[0]

    await services.useCases.updateAttendanceList.handle({
      attendanceListId: persistedAttendanceList.id,
      memberIds: persistedMembers.map((member) => member.id),
      start: new Date('2026-03-27T19:00:00Z')
    })

    await expect(
      services.queries.getAttendanceSessionById.handle({
        attendanceListId: persistedAttendanceList.id
      })
    ).resolves.toEqual({
      id: persistedAttendanceList.id,
      memberIds: persistedMembers.map((member) => member.id),
      start: new Date('2026-03-27T19:00:00Z')
    })

    const persistedEvents = await database.events.toArray()
    const updatedEvent = persistedEvents.find(
      (event) => event.eventName === 'attendance-list.updated'
    ) as PersistedDomainEvent<AttendanceListSnapshot> | undefined

    expect(updatedEvent).toMatchObject({
      eventName: 'attendance-list.updated',
      // Updating attendance must persist the same snapshot payload as the stored row so replay and edit hydration keep one contract.
      payload: {
        id: persistedAttendanceList.id,
        memberIds: persistedMembers.map((member) => member.id),
        start: new Date('2026-03-27T19:00:00Z')
      }
    })
  })

  it('assembles the reactive monthly membership payment status query on top of the Dexie adapters', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Amanda',
      lastName: 'Nunes',
      phoneNumber: '+48 111 111 111',
      dateOfBirth: new Date('1990-05-30T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'Georges',
      lastName: 'St-Pierre',
      phoneNumber: '+48 222 222 222',
      dateOfBirth: new Date('1981-05-19T00:00:00Z')
    })
    await services.useCases.registerMember.handle({
      firstName: 'Royce',
      lastName: 'Gracie',
      phoneNumber: '+48 333 333 333',
      dateOfBirth: new Date('1966-12-12T00:00:00Z')
    })

    const [amanda, georges, royce] = await database.members.toArray()

    await services.useCases.registerMembershipPayment.handle({
      memberId: amanda.id,
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 160_00,
        currency: 'PLN'
      }
    })
    await services.useCases.registerAttendanceList.handle({
      memberIds: [royce.id],
      start: new Date('2026-03-05T18:00:00Z')
    })
    await services.useCases.registerAttendanceList.handle({
      memberIds: [royce.id, amanda.id],
      start: new Date('2026-03-12T18:00:00Z')
    })

    const query = services.queries.observeMembershipPaymentStatusByMonth

    await expect(
      waitForFirstEmission(
        query.handle({
          month: new Date('2026-03-16T12:00:00Z')
        })
      )
    ).resolves.toEqual({
      paidMembers: [
        {
          id: amanda.id,
          membershipPaymentId: expect.any(String),
          firstName: 'amanda',
          lastName: 'nunes',
          dateOfBirth: new Date('1990-05-30T00:00:00Z'),
          hasPhoneNumber: true
        }
      ],
      unpaidAbsentMembers: [
        {
          id: georges.id,
          firstName: 'georges',
          lastName: 'st-pierre',
          dateOfBirth: new Date('1981-05-19T00:00:00Z'),
          hasPhoneNumber: true
        }
      ],
      unpaidAttendedMembers: [
        {
          id: royce.id,
          firstName: 'royce',
          lastName: 'gracie',
          dateOfBirth: new Date('1966-12-12T00:00:00Z'),
          hasPhoneNumber: true,
          attendanceSessionIds: expect.arrayContaining([expect.any(String)])
        }
      ]
    })

    const attendanceLists = await database.attendanceLists
      .where('start')
      .between(
        new Date('2026-03-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z'),
        true,
        false
      )
      .toArray()

    expect(
      (
        await waitForFirstEmission(
          query.handle({
            month: new Date('2026-03-16T12:00:00Z')
          })
        )
      ).unpaidAttendedMembers[0].attendanceSessionIds
    ).toEqual(attendanceLists.map((attendanceList) => attendanceList.id))
  })

  it('assembles the demo bootstrap workflow with dynamic months and varied unpaid attendance', async () => {
    const now = new Date()
    const expectedDemoSeed = createDemoSeed(now)
    const previousMonthReference = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      Math.min(now.getDate(), 9),
      12,
      0,
      0
    )
    const services = createAppServices(database)

    await expect(
      services.useCases.bootstrapDemoMode.handle({})
    ).resolves.toEqual({
      demoModeActive: true,
      introModal: true
    })
    await expect(database.clubs.count()).resolves.toBe(1)
    await expect(database.trainers.count()).resolves.toBe(1)
    await expect(database.members.count()).resolves.toBe(60)

    const currentMonthStatus = await waitForFirstEmission(
      services.queries.observeMembershipPaymentStatusByMonth.handle({
        month: now
      })
    )
    const currentMonthSessions =
      await services.queries.listAttendanceSessionsByMonth.handle({
        month: now
      })
    const previousMonthStatus = await waitForFirstEmission(
      services.queries.observeMembershipPaymentStatusByMonth.handle({
        month: previousMonthReference
      })
    )
    const previousMonthSessions =
      await services.queries.listAttendanceSessionsByMonth.handle({
        month: previousMonthReference
      })

    expect(currentMonthStatus.paidMembers.length).toBeGreaterThan(0)
    expect(currentMonthStatus.unpaidAbsentMembers.length).toBeGreaterThan(0)
    expect(currentMonthStatus.unpaidAttendedMembers.length).toBeGreaterThan(0)
    expect(currentMonthStatus.unpaidAttendedMembers.length).toBeLessThanOrEqual(
      3
    )
    if (currentMonthStatus.unpaidAttendedMembers.length > 1) {
      expect(
        new Set(
          currentMonthStatus.unpaidAttendedMembers.map(
            (member) => member.attendanceSessionIds.length
          )
        ).size
      ).toBeGreaterThan(1)
    }
    expect(previousMonthStatus.paidMembers.length).toBeGreaterThan(0)
    expect(previousMonthStatus.unpaidAbsentMembers.length).toBeGreaterThan(0)
    expect(previousMonthStatus.unpaidAttendedMembers.length).toBeGreaterThan(0)
    expect(
      previousMonthStatus.unpaidAttendedMembers.length
    ).toBeLessThanOrEqual(3)
    if (previousMonthStatus.unpaidAttendedMembers.length > 1) {
      expect(
        new Set(
          previousMonthStatus.unpaidAttendedMembers.map(
            (member) => member.attendanceSessionIds.length
          )
        ).size
      ).toBeGreaterThan(1)
    }
    expect(currentMonthSessions).toHaveLength(
      expectedDemoSeed.summary.currentMonthSessionCount
    )
    expect(
      currentMonthSessions.every(
        (attendanceSession) =>
          attendanceSession.start.getTime() <= now.getTime()
      )
    ).toBe(true)
    expect(previousMonthSessions).toHaveLength(
      expectedDemoSeed.summary.previousMonthSessionCount
    )
    expect(window.localStorage.getItem(DEMO_MODE_ACTIVE_STORAGE_KEY)).toBe('1')
  })

  it('keeps demo mode active after a refreshed boot while the seeded notebook still exists', async () => {
    const services = createAppServices(database)

    await expect(
      services.useCases.bootstrapDemoMode.handle({})
    ).resolves.toEqual({
      demoModeActive: true,
      introModal: true
    })

    const refreshedServices = createAppServices(database)

    await expect(
      refreshedServices.useCases.bootstrapDemoMode.handle({})
    ).resolves.toEqual({
      demoModeActive: true,
      introModal: false
    })
  })

  it('does not overwrite incomplete local notebook data with demo seed content', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Local',
      lastName: 'Only',
      phoneNumber: '+48 500 600 700',
      dateOfBirth: createBirthDate('2012-05-01T00:00:00Z')
    })

    await expect(
      services.useCases.bootstrapDemoMode.handle({})
    ).resolves.toEqual({
      demoModeActive: false,
      introModal: false
    })
    await expect(database.members.count()).resolves.toBe(1)
    await expect(database.clubs.count()).resolves.toBe(0)
    await expect(database.trainers.count()).resolves.toBe(0)
  })

  it('assembles the leave-demo workflow that clears seeded data and suppresses future auto-demo boots', async () => {
    const services = createAppServices(database)

    await services.useCases.bootstrapDemoMode.handle({})
    await services.useCases.leaveDemoMode.handle({})

    await expect(database.clubs.count()).resolves.toBe(0)
    await expect(database.trainers.count()).resolves.toBe(0)
    await expect(database.members.count()).resolves.toBe(0)
    await expect(database.membershipPayments.count()).resolves.toBe(0)
    await expect(database.attendanceLists.count()).resolves.toBe(0)
    await expect(database.events.count()).resolves.toBe(0)
    expect(window.localStorage.getItem(DEMO_LIFECYCLE_STORAGE_KEY)).toBe(
      'dismissed'
    )
    expect(window.localStorage.getItem(DEMO_MODE_ACTIVE_STORAGE_KEY)).toBeNull()
    await expect(
      services.useCases.bootstrapDemoMode.handle({})
    ).resolves.toEqual({
      demoModeActive: false,
      introModal: false
    })
    await expect(database.members.count()).resolves.toBe(0)
  })

  it('assembles the reactive setup-status query on top of the Dexie adapters', async () => {
    const services = createAppServices(database)

    await expect(
      waitForFirstEmission(services.queries.observeSetupStatus.handle())
    ).resolves.toBe('requires-club')

    await services.useCases.registerClub.handle({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })

    await expect(
      waitForFirstEmission(services.queries.observeSetupStatus.handle())
    ).resolves.toBe('requires-trainer')

    await services.useCases.registerTrainer.handle({
      trainerName: 'Jan Kowalski'
    })

    await expect(
      waitForFirstEmission(services.queries.observeSetupStatus.handle())
    ).resolves.toBe('ready')
  })

  it('throws a domain error when trying to register a second club', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerClub

    await useCase.handle({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })

    await expect(
      useCase.handle({
        clubName: 'Falubaz Zielona Gora',
        foundingDate: new Date('1946-01-01T00:00:00Z')
      })
    ).rejects.toThrow(ClubAlreadyExistsError)

    await expect(database.clubs.toArray()).resolves.toHaveLength(1)
    await expect(database.events.toArray()).resolves.toHaveLength(1)
  })

  it('assembles Dexie adapters that persist a trainer and matching event row', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerTrainer

    await useCase.handle({
      trainerName: 'Jane Doe'
    })

    const persistedTrainers = await database.trainers.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedTrainer = persistedTrainers[0]
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<TrainerSnapshot>

    expect(persistedTrainers).toHaveLength(1)
    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'trainer.created',
      payload: {
        id: persistedTrainer.id,
        name: persistedTrainer.name,
        createdAt: persistedTrainer.createdAt
      }
    })
  })

  it('throws a domain error when trying to register a second trainer', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerTrainer

    await useCase.handle({
      trainerName: 'Jane Doe'
    })

    await expect(
      useCase.handle({
        trainerName: 'John Smith'
      })
    ).rejects.toThrow(TrainerAlreadyExistsError)

    await expect(database.trainers.toArray()).resolves.toHaveLength(1)
    await expect(database.events.toArray()).resolves.toHaveLength(1)
  })

  it('assembles Dexie adapters that persist a member and matching event row', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerMember

    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: new Date('2010-01-01T00:00:00Z'),
      joinedAt: new Date('2024-09-01T00:00:00Z')
    })

    const persistedMembers = await database.members.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedMember = persistedMembers[0]
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<MemberSnapshot>

    expect(persistedMembers).toHaveLength(1)
    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'member.created',
      payload: {
        id: persistedMember.id,
        firstName: persistedMember.firstName,
        lastName: persistedMember.lastName,
        phoneNumber: '+48123456789',
        dateOfBirth: persistedMember.dateOfBirth,
        joinedAt: persistedMember.joinedAt,
        createdAt: persistedMember.createdAt
      }
    })
  })

  it('throws a domain error when trying to register the same member identity twice', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerMember

    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    await expect(
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789',
        dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
      })
    ).rejects.toThrow(MemberAlreadyExistsError)

    await expect(database.members.toArray()).resolves.toHaveLength(1)
    await expect(database.events.toArray()).resolves.toHaveLength(1)
  })

  it('keeps a concurrent double-submit of the same member identity to one row and one event', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerMember

    const results = await Promise.allSettled([
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48 123 456 789',
        dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
      }),
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789',
        dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
      })
    ])

    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === 'rejected')
    ).toHaveLength(1)
    expect(
      results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )?.reason
    ).toBeInstanceOf(MemberAlreadyExistsError)
    await expect(database.members.toArray()).resolves.toHaveLength(1)
    await expect(database.events.toArray()).resolves.toHaveLength(1)
  })

  it('allows registering many members when their identity differs', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerMember

    await useCase.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    await useCase.handle({
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+48123456789',
      dateOfBirth: createBirthDate('2011-01-01T00:00:00Z')
    })

    await expect(database.members.toArray()).resolves.toHaveLength(2)
    await expect(database.events.toArray()).resolves.toHaveLength(2)
  })

  it('assembles Dexie adapters that persist a membership payment and matching event row', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    const persistedMember = (await database.members.toArray())[0]

    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMember.id,
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 160_00,
        currency: 'PLN'
      }
    })

    const persistedPayments = await database.membershipPayments.toArray()
    const persistedEvents = await database.events.toArray()
    const persistedPayment = persistedPayments[0]
    const persistedEvent = persistedEvents.find(
      (event) => event.eventName === 'membership-payment.recorded'
    ) as PersistedDomainEvent<MembershipPaymentSnapshot> | undefined

    expect(persistedPayments).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventName: 'membership-payment.recorded',
      payload: {
        id: persistedPayment.id,
        memberId: persistedPayment.memberId,
        coveredMonth: persistedPayment.coveredMonth,
        chargedAmount: {
          amountMinor: 160_00,
          currency: 'PLN'
        },
        createdAt: persistedPayment.createdAt
      }
    })
  })

  it('throws a domain error when trying to register the same member-month payment twice', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    const persistedMember = (await database.members.toArray())[0]

    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMember.id,
      coveredMonth: '2026-03',
      chargedAmount: {
        amountMinor: 160_00,
        currency: 'PLN'
      }
    })

    await expect(
      services.useCases.registerMembershipPayment.handle({
        memberId: persistedMember.id,
        coveredMonth: '2026-03',
        chargedAmount: {
          amountMinor: 160_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(MembershipPaymentAlreadyExistsError)

    const persistedPaymentEvents = (await database.events.toArray()).filter(
      (event) => event.eventName === 'membership-payment.recorded'
    )

    await expect(database.membershipPayments.toArray()).resolves.toHaveLength(1)
    expect(persistedPaymentEvents).toHaveLength(1)
  })

  it('throws a domain error when trying to register a membership payment for an unknown member', async () => {
    const services = createAppServices(database)

    await expect(
      services.useCases.registerMembershipPayment.handle({
        memberId: 'missing-member',
        coveredMonth: '2026-03',
        chargedAmount: {
          amountMinor: 160_00,
          currency: 'PLN'
        }
      })
    ).rejects.toThrow(MemberNotFoundError)

    await expect(database.membershipPayments.toArray()).resolves.toHaveLength(0)
    await expect(database.events.toArray()).resolves.toHaveLength(0)
  })

  it('throws a domain error when trying to register the same attendance start twice', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789',
      dateOfBirth: createBirthDate('2010-01-01T00:00:00Z')
    })

    const persistedMember = (await database.members.toArray())[0]
    const start = new Date('2026-03-27T18:00:00Z')

    await services.useCases.registerAttendanceList.handle({
      memberIds: [persistedMember.id],
      start
    })

    await expect(
      services.useCases.registerAttendanceList.handle({
        memberIds: [persistedMember.id],
        start
      })
    ).rejects.toThrow(AttendanceListAlreadyExistsError)

    const attendanceEvents = (await database.events.toArray()).filter(
      (event) => event.eventName === 'attendance-list.recorded'
    )

    await expect(database.attendanceLists.toArray()).resolves.toHaveLength(1)
    expect(attendanceEvents).toHaveLength(1)
  })

  it('throws a domain error when trying to register an attendance list for an unknown member', async () => {
    const services = createAppServices(database)

    await expect(
      services.useCases.registerAttendanceList.handle({
        memberIds: ['missing-member'],
        start: new Date('2026-03-27T18:00:00Z')
      })
    ).rejects.toThrow(MemberNotFoundError)

    await expect(database.attendanceLists.toArray()).resolves.toHaveLength(0)
    await expect(database.events.toArray()).resolves.toHaveLength(0)
  })
})

function waitForFirstEmission<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next(value) {
        resolve(value)
        queueMicrotask(() => subscription.unsubscribe())
      },
      error(error) {
        reject(error)
        queueMicrotask(() => subscription.unsubscribe())
      }
    })
  })
}
