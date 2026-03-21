import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DomainEvent } from '@/domain/events/DomainEvent'
import { Club } from '@/domain/model/club'
import { MembershipPayment } from '@/domain/model/MembershipPayment'
import { Member } from '@/domain/model/member'
import { Trainer } from '@/domain/model/trainer'
import {
  DexieEventRepo,
  type PersistedClubCreatedEvent,
  type PersistedMemberCreatedEvent,
  type PersistedMembershipPaymentRecordedEvent,
  type PersistedTrainerCreatedEvent
} from '@/infra/db/DexieEventRepo'
import { TrainerNotebookDb } from '@/infra/db'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

class UnsupportedDomainEvent extends DomainEvent {
  public readonly eventName = 'unsupported.event'

  public constructor() {
    super()
  }
}

describe('DexieEventRepo', () => {
  let database: TrainerNotebookDb
  let repository: DexieEventRepo

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('event-repo'))
    repository = new DexieEventRepo(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists a club.created event into the generic event log', async () => {
    const [, event] = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z'),
      'club-1'
    )

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent = persistedEvents[0] as PersistedClubCreatedEvent

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'club.created',
      occurredAt: event.occurredAt,
      payload: {
        club: event.club
      }
    })
  })

  it('persists a trainer.created event into the generic event log', async () => {
    const [, event] = Trainer.register('Jane Doe', 'trainer-1')

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent = persistedEvents[0] as PersistedTrainerCreatedEvent

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'trainer.created',
      occurredAt: event.occurredAt,
      payload: {
        trainer: event.trainer
      }
    })
  })

  it('persists a member.created event into the generic event log', async () => {
    const [, event] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+48123456789',
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
        joinedAt: new Date('2024-09-01T00:00:00Z')
      },
      'member-1'
    )

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent = persistedEvents[0] as PersistedMemberCreatedEvent

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'member.created',
      occurredAt: event.occurredAt,
      payload: {
        member: event.member
      }
    })
  })

  it('persists a membership-payment.recorded event into the generic event log', async () => {
    const [, event] = MembershipPayment.record(
      {
        memberId: 'member-1',
        coveredMonth: '2026-03'
      },
      'payment-1'
    )

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent =
      persistedEvents[0] as PersistedMembershipPaymentRecordedEvent

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'membership-payment.recorded',
      occurredAt: event.occurredAt,
      payload: {
        payment: event.payment
      }
    })
  })

  it('throws and does not persist anything for an unsupported event', async () => {
    const unsupportedEvent = new UnsupportedDomainEvent()

    await expect(repository.save(unsupportedEvent)).rejects.toThrow(
      'Unsupported domain event: unsupported.event'
    )
    await expect(database.events.count()).resolves.toBe(0)
  })
})
