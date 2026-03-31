import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  AttendanceListAlreadyExistsError,
  type AttendanceListSnapshot
} from '@/domain/model/AttendanceList'
import { ClubAlreadyExistsError, type ClubSnapshot } from '@/domain/model/club'
import {
  MembershipPaymentAlreadyExistsError,
  type MembershipPaymentSnapshot
} from '@/domain/model/MembershipPayment'
import {
  type MemberSnapshot,
  MemberAlreadyExistsError,
  MemberNotFoundError
} from '@/domain/model/member'
import {
  TrainerAlreadyExistsError,
  type TrainerSnapshot
} from '@/domain/model/trainer'
import { createAppServices } from '@/appServices'
import type { PersistedDomainEvent } from '@/infra'
import { TrainerNotebookDb } from '@/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('appServices', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('register-club'))
  })

  afterEach(async () => {
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
      phoneNumber: '+48 123 456 789'
    })
    await services.useCases.registerMember.handle({
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+48 987 654 321'
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

  it('assembles the month attendance query on top of the Dexie repo adapters', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789'
    })
    await services.useCases.registerMember.handle({
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+48 987 654 321'
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
        monthStart: new Date('2026-03-01T00:00:00Z'),
        nextMonthStart: new Date('2026-04-01T00:00:00Z')
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

  it('throws a domain error when trying to register a second club', async () => {
    const services = createAppServices(database)
    const useCase = services.useCases.registerClub

    await useCase.handle({
      clubName: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z')
    })

    expect(
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

    expect(
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
      phoneNumber: '+48 123 456 789'
    })

    await expect(
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
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
        phoneNumber: '+48 123 456 789'
      }),
      useCase.handle({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789'
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
      phoneNumber: '+48123456789'
    })

    await useCase.handle({
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+48123456789'
    })

    await expect(database.members.toArray()).resolves.toHaveLength(2)
    await expect(database.events.toArray()).resolves.toHaveLength(2)
  })

  it('assembles Dexie adapters that persist a membership payment and matching event row', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789'
    })

    const persistedMember = (await database.members.toArray())[0]

    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMember.id,
      coveredMonth: '2026-03'
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
        createdAt: persistedPayment.createdAt
      }
    })
  })

  it('throws a domain error when trying to register the same member-month payment twice', async () => {
    const services = createAppServices(database)

    await services.useCases.registerMember.handle({
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+48 123 456 789'
    })

    const persistedMember = (await database.members.toArray())[0]

    await services.useCases.registerMembershipPayment.handle({
      memberId: persistedMember.id,
      coveredMonth: '2026-03'
    })

    await expect(
      services.useCases.registerMembershipPayment.handle({
        memberId: persistedMember.id,
        coveredMonth: '2026-03'
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
        coveredMonth: '2026-03'
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
      phoneNumber: '+48 123 456 789'
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
