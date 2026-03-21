import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { DomainEvent } from '@/domain/events/DomainEvent'
import { ClubCreatedDomainEvent } from '@/domain/model/club'
import { MembershipPaymentRecordedDomainEvent } from '@/domain/model/MembershipPayment'
import { MemberCreatedDomainEvent } from '@/domain/model/member'
import { TrainerCreatedDomainEvent } from '@/domain/model/trainer'
import type { PersistedDomainEvent, TrainerNotebookDb } from '@/infra/db'

export type PersistedClubSnapshot = {
  id: string
  name: string
  foundingDate: Date
  createdAt: Date
}

export type PersistedClubCreatedPayload = {
  club: PersistedClubSnapshot
}

export type PersistedClubCreatedEvent =
  PersistedDomainEvent<PersistedClubCreatedPayload> & {
    eventName: 'club.created'
  }

export type PersistedTrainerSnapshot = {
  id: string
  name: string
  createdAt: Date
}

export type PersistedTrainerCreatedPayload = {
  trainer: PersistedTrainerSnapshot
}

export type PersistedTrainerCreatedEvent =
  PersistedDomainEvent<PersistedTrainerCreatedPayload> & {
    eventName: 'trainer.created'
  }

export type PersistedMemberSnapshot = {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth?: Date
  joinedAt?: Date
  createdAt: Date
}

export type PersistedMemberCreatedPayload = {
  member: PersistedMemberSnapshot
}

export type PersistedMemberCreatedEvent =
  PersistedDomainEvent<PersistedMemberCreatedPayload> & {
    eventName: 'member.created'
  }

export type PersistedMembershipPaymentSnapshot = {
  id: string
  memberId: string
  coveredMonth: string
  createdAt: Date
}

export type PersistedMembershipPaymentRecordedPayload = {
  payment: PersistedMembershipPaymentSnapshot
}

export type PersistedMembershipPaymentRecordedEvent =
  PersistedDomainEvent<PersistedMembershipPaymentRecordedPayload> & {
    eventName: 'membership-payment.recorded'
  }

export class DexieEventRepo implements EventRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(event: DomainEvent): Promise<void> {
    await this.database.events.add(this.toPersistedEvent(event))
  }

  private toPersistedEvent(event: DomainEvent): PersistedDomainEvent<unknown> {
    if (event instanceof ClubCreatedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          // The event log reuses the same club snapshot as the main table so replay data matches persisted state.
          club: event.club
        } satisfies PersistedClubCreatedPayload
      } satisfies PersistedClubCreatedEvent
    }

    if (event instanceof TrainerCreatedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          // Trainer events now already carry a snapshot so the event log can persist the exact payload emitted by the domain.
          trainer: event.trainer
        } satisfies PersistedTrainerCreatedPayload
      } satisfies PersistedTrainerCreatedEvent
    }

    if (event instanceof MemberCreatedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          // Member events now already carry the canonical snapshot so replays and persisted records see identical phone and date data.
          member: event.member
        } satisfies PersistedMemberCreatedPayload
      } satisfies PersistedMemberCreatedEvent
    }

    if (event instanceof MembershipPaymentRecordedDomainEvent) {
      return {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        payload: {
          // Payment events now already carry the stored snapshot so the offline event log can replay the exact recorded month state.
          payment: event.payment
        } satisfies PersistedMembershipPaymentRecordedPayload
      } satisfies PersistedMembershipPaymentRecordedEvent
    }

    throw new Error(`Unsupported domain event: ${event.eventName}`)
  }
}
// refactor this to some kind of registry pattern
