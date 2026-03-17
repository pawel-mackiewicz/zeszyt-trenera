import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Club } from '@/domain/model/club'
import { TrainerNotebookDb } from '@/infra/db'
import { inspectIndexedDb } from '@/ui/composables/useIndexedDbInspector'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('inspectIndexedDb', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('indexeddb-inspector'))
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('captures schema metadata and rows for every declared Dexie table', async () => {
    const event = Club.register(
      'ZKS Włókniarz Częstochowa',
      new Date('1946-01-01T00:00:00Z')
    )

    await database.open()
    await database.clubs.add({
      id: event.club.id,
      name: event.club.name,
      foundingDate: event.club.foundingDate,
      createdAt: event.club.createdAt
    })
    await database.events.add({
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      payload: {
        club: {
          id: event.club.id,
          name: event.club.name,
          foundingDate: event.club.foundingDate,
          createdAt: event.club.createdAt
        }
      }
    })

    const snapshot = await inspectIndexedDb(database)
    const clubsTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'clubs'
    )
    const eventsTable = snapshot.tableSnapshots.find(
      (table) => table.name === 'events'
    )

    expect(snapshot.databaseName).toBe(database.name)
    expect(snapshot.schemaVersion).toBe(2)
    expect(snapshot.tableSnapshots).toHaveLength(2)
    expect(clubsTable).toMatchObject({
      primaryKey: 'id',
      indexes: ['_name'],
      rowCount: 1,
      columns: ['id', 'name', 'foundingDate', 'createdAt']
    })
    expect(clubsTable?.rows[0]).toMatchObject({
      id: event.club.id,
      name: event.club.name,
      foundingDate: event.club.foundingDate,
      createdAt: event.club.createdAt
    })
    expect(eventsTable).toMatchObject({
      primaryKey: 'eventId',
      indexes: ['eventName', 'occurredAt'],
      rowCount: 1,
      columns: ['eventId', 'eventName', 'occurredAt', 'payload']
    })
    expect(eventsTable?.rows[0]).toMatchObject({
      eventId: event.eventId,
      eventName: 'club.created',
      occurredAt: event.occurredAt,
      payload: {
        club: {
          id: event.club.id,
          name: event.club.name,
          foundingDate: event.club.foundingDate,
          createdAt: event.club.createdAt
        }
      }
    })
  })
})
