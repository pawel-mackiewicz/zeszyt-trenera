import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DomainEvent } from '@/domain/events/DomainEvent'
import { Club, type ClubSnapshot } from '@/domain/model/club'
import {
  MembershipPayment,
  type MembershipPaymentSnapshot
} from '@/domain/model/MembershipPayment'
import { Member, type MemberSnapshot } from '@/domain/model/member'
import { Trainer, type TrainerSnapshot } from '@/domain/model/trainer'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'
import { type PersistedDomainEvent, TrainerNotebookDb } from '@/infra/db'
import { DexieEventRepo } from '@/infra/db/DexieEventRepo'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

class CustomDomainEvent extends DomainEvent<{ note: string }> {
  public readonly eventName = 'custom.event'

  public constructor(note: string) {
    super({ note })
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
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<ClubSnapshot>

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'club.created',
      occurredAt: event.occurredAt,
      payload: event.payload
    })
  })

  it('persists a trainer.created event into the generic event log', async () => {
    const [, event] = Trainer.register('Jane Doe', 'trainer-1')

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<TrainerSnapshot>

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'trainer.created',
      occurredAt: event.occurredAt,
      payload: event.payload
    })
  })

  it('persists a member.created event into the generic event log', async () => {
    const [, event] = Member.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: PhoneNumber.create('+48123456789'),
        dateOfBirth: new Date('2010-01-01T00:00:00Z'),
        joinedAt: new Date('2024-09-01T00:00:00Z')
      },
      'member-1'
    )

    await repository.save(event)

    const persistedEvents = await database.events.toArray()
    const persistedEvent =
      persistedEvents[0] as PersistedDomainEvent<MemberSnapshot>

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'member.created',
      occurredAt: event.occurredAt,
      payload: event.payload
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
      persistedEvents[0] as PersistedDomainEvent<MembershipPaymentSnapshot>

    expect(persistedEvents).toHaveLength(1)
    expect(persistedEvent).toMatchObject({
      eventId: event.eventId,
      eventName: 'membership-payment.recorded',
      occurredAt: event.occurredAt,
      payload: event.payload
    })
  })

  it('persists arbitrary payload-bearing events without repo-specific branching', async () => {
    const customEvent = new CustomDomainEvent('generic persistence works')

    await repository.save(customEvent)

    await expect(database.events.toArray()).resolves.toMatchObject([
      {
        eventId: customEvent.eventId,
        eventName: 'custom.event',
        occurredAt: customEvent.occurredAt,
        payload: customEvent.payload
      }
    ])
  })
})
