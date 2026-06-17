import Dexie, { type EntityTable } from 'dexie'

import type {
  PersistedAttendanceList,
  PersistedCamp,
  PersistedCampParticipant,
  PersistedClub,
  PersistedDomainEvent,
  PersistedMember,
  PersistedMembershipPayment,
  PersistedTrainer
} from '@/write/shared/infra'

// The root module keeps the Dexie table wiring in one place so the app gets one concrete database instance while the row contracts stay under infra.
export class TrainerNotebookDb extends Dexie {
  public clubs!: EntityTable<PersistedClub, 'id'>
  public trainers!: EntityTable<PersistedTrainer, 'id'>
  public members!: EntityTable<PersistedMember, 'id'>
  public membershipPayments!: EntityTable<PersistedMembershipPayment, 'id'>
  public attendanceLists!: EntityTable<PersistedAttendanceList, 'id'>
  public camps!: EntityTable<PersistedCamp, 'id'>
  public campParticipants!: EntityTable<PersistedCampParticipant, 'id'>
  public events!: EntityTable<PersistedDomainEvent<unknown>, 'eventId'>

  public constructor(databaseName = 'trainer-notebook') {
    super(databaseName)

    this.version(1).stores({
      clubs: 'id, _name'
    })

    this.version(2).stores({
      clubs: 'id, _name',
      events: 'eventId, eventName, occurredAt'
    })

    this.version(3).stores({
      clubs: 'id, _name',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id, name'
    })

    this.version(4).stores({
      clubs: 'id, _name',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id, name',
      // The compound identity index lets offline duplicate checks stay deterministic without scanning the whole member table.
      members: 'id, [firstName+lastName+phoneNumber]'
    })

    this.version(5).stores({
      // The local-first schema must index the persisted club snapshot contract, not the aggregate's private field names.
      clubs: 'id, name',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id, name',
      // The compound identity index lets offline duplicate checks stay deterministic without scanning the whole member table.
      members: 'id, [firstName+lastName+phoneNumber]'
    })

    this.version(6).stores({
      // Club and trainer setup stays single-record today, so removing unused name indexes avoids extra write work on mobile devices.
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // The compound identity index lets offline duplicate checks stay deterministic without scanning the whole member table.
      members: 'id, [firstName+lastName+phoneNumber]'
    })

    this.version(7).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // The compound identity index lets offline duplicate checks stay deterministic
      members: 'id, [firstName+lastName+phoneNumber]',
      // Membership payment registration only needs one month-level uniqueness index
      membershipPayments: 'id, [memberId+coveredMonth]'
    })

    this.version(8).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // The compound identity index lets offline duplicate checks stay deterministic
      members: 'id, [firstName+lastName+phoneNumber]',
      // Membership payment registration only needs one month-level uniqueness index
      membershipPayments: 'id, [memberId+coveredMonth]',
      // Attendance registration must reject duplicate session starts offline without scanning all recorded sessions on a phone.
      attendanceLists: 'id, &start'
    })

    this.version(9).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // The compound identity index lets offline duplicate checks stay deterministic
      members: 'id, [firstName+lastName+phoneNumber]',
      // What: add a month-only payment index. Why: the reactive payments ledger groups by covered month first, so mobile re-reads should not scan the full payment table after every local write.
      membershipPayments: 'id, [memberId+coveredMonth], coveredMonth',
      // Attendance registration must reject duplicate session starts offline without scanning all recorded sessions on a phone.
      attendanceLists: 'id, &start'
    })

    this.version(10)
      .stores({
        clubs: 'id',
        events: 'eventId, eventName, occurredAt',
        trainers: 'id',
        // The compound identity index still supports duplicate checks when a phone number exists, while members without one simply stay out of that optional index path.
        members: 'id, [firstName+lastName+phoneNumber]',
        // What: keep the month-level payment lookup introduced in v9. Why: payment status reads still group by month first on mobile devices.
        membershipPayments: 'id, [memberId+coveredMonth], coveredMonth',
        // Attendance registration must reject duplicate session starts offline without scanning all recorded sessions on a phone.
        attendanceLists: 'id, &start'
      })
      .upgrade((transaction) => {
        // What: remove the old empty-string phone sentinel from member rows. Why: persistence now needs to preserve the difference between "phone missing" and "phone stored" for local-first rehydration.
        return transaction
          .table('members')
          .toCollection()
          .modify((member: PersistedMember) => {
            if (member.phoneNumber === '') {
              delete member.phoneNumber
            }
          })
      })

    this.version(11).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // Why: duplicate member checks now use stable identity data instead of optional contact data, so local-first registration needs a name-plus-birth-date index.
      members: 'id, [firstName+lastName+dateOfBirth]',
      // What: keep the month-level payment lookup introduced in v9. Why: payment status reads still group by month first on mobile devices.
      membershipPayments: 'id, [memberId+coveredMonth], coveredMonth',
      // Attendance registration must reject duplicate session starts offline without scanning all recorded sessions on a phone.
      attendanceLists: 'id, &start'
    })

    this.version(12).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // Why: duplicate member checks now use stable identity data instead of optional contact data, so local-first registration needs a name-plus-birth-date index.
      members: 'id, [firstName+lastName+dateOfBirth]',
      // Why: member deletion must detect payment dependencies by member id without scanning a full local ledger on a phone.
      membershipPayments: 'id, memberId, [memberId+coveredMonth], coveredMonth',
      // Why: member deletion must detect attendance dependencies by member id while preserving the duplicate-session start guard.
      attendanceLists: 'id, &start, *memberIds'
    })

    this.version(13).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // Why: duplicate member checks now use stable identity data instead of optional contact data, so local-first registration needs a name-plus-birth-date index.
      members: 'id, [firstName+lastName+dateOfBirth]',
      // Why: member deletion must detect payment dependencies by member id without scanning a full local ledger on a phone.
      membershipPayments: 'id, memberId, [memberId+coveredMonth], coveredMonth',
      // Why: member deletion must detect attendance dependencies by member id while preserving the duplicate-session start guard.
      attendanceLists: 'id, &start, *memberIds',
      // Camp registration stores local snapshots by id today; reads can add focused indexes when camp screens land.
      camps: 'id'
    })

    this.version(14).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // Why: duplicate member checks now use stable identity data instead of optional contact data, so local-first registration needs a name-plus-birth-date index.
      members: 'id, [firstName+lastName+dateOfBirth]',
      // Why: member deletion must detect payment dependencies by member id without scanning a full local ledger on a phone.
      membershipPayments: 'id, memberId, [memberId+coveredMonth], coveredMonth',
      // Why: member deletion must detect attendance dependencies by member id while preserving the duplicate-session start guard.
      attendanceLists: 'id, &start, *memberIds',
      // Camp registration stores local snapshots by id today; reads can add focused indexes when camp screens land.
      camps: 'id',
      // The camp/person compound key keeps local duplicate participant checks deterministic without scanning all camp rosters.
      campParticipants: 'id, [campId+personKey]'
    })

    this.version(15).stores({
      clubs: 'id',
      events: 'eventId, eventName, occurredAt',
      trainers: 'id',
      // Why: duplicate member checks now use stable identity data instead of optional contact data, so local-first registration needs a name-plus-birth-date index.
      members: 'id, [firstName+lastName+dateOfBirth]',
      // Why: member deletion must detect payment dependencies by member id without scanning a full local ledger on a phone.
      membershipPayments: 'id, memberId, [memberId+coveredMonth], coveredMonth',
      // Why: member deletion must detect attendance dependencies by member id while preserving the duplicate-session start guard.
      attendanceLists: 'id, &start, *memberIds',
      // Camp registration stores local snapshots by id today; reads can add focused indexes when camp screens land.
      camps: 'id',
      // Camp details need camp-level roster reads, while the compound key still keeps duplicate participant checks deterministic.
      campParticipants: 'id, campId, [campId+personKey]'
    })
  }
}

//todo remove this. db should be created only in main.ts
export const db = new TrainerNotebookDb()
