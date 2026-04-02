import type { Observable } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrainerNotebookDb } from '@/db'
import {
  ObserveSetupStatusQuery,
  type SetupStatus
} from '@/read/ObserveSetupStatusQuery'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('ObserveSetupStatusQuery', () => {
  let database: TrainerNotebookDb
  let query: ObserveSetupStatusQuery

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('setup-status-read'))
    query = new ObserveSetupStatusQuery(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('requires the club step when no setup data is persisted yet', async () => {
    await expect(waitForFirstEmission(query.handle())).resolves.toBe(
      'requires-club'
    )
  })

  it('moves to the trainer step once the club record is created', async () => {
    const [beforeClub, afterClub] = await waitForMutationEmission(
      query.handle(),
      async () => {
        await database.clubs.add({
          id: 'club-1',
          name: 'ZKS Włókniarz Częstochowa',
          foundingDate: new Date('1946-01-01T00:00:00Z'),
          createdAt: new Date('2026-04-02T10:00:00Z')
        })
      }
    )

    expect(beforeClub).toBe('requires-club')
    expect(afterClub).toBe('requires-trainer')
  })

  it('becomes ready when both the club and trainer are already present', async () => {
    await database.clubs.add({
      id: 'club-1',
      name: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z'),
      createdAt: new Date('2026-04-02T10:00:00Z')
    })
    await database.trainers.add({
      id: 'trainer-1',
      name: 'Jan Kowalski',
      createdAt: new Date('2026-04-02T10:05:00Z')
    })

    await expect(waitForFirstEmission(query.handle())).resolves.toBe('ready')
  })

  it('re-emits ready when the trainer record completes an existing club setup', async () => {
    await database.clubs.add({
      id: 'club-1',
      name: 'ZKS Włókniarz Częstochowa',
      foundingDate: new Date('1946-01-01T00:00:00Z'),
      createdAt: new Date('2026-04-02T10:00:00Z')
    })

    const [beforeTrainer, afterTrainer] = await waitForMutationEmission(
      query.handle(),
      async () => {
        await database.trainers.add({
          id: 'trainer-1',
          name: 'Jan Kowalski',
          createdAt: new Date('2026-04-02T10:05:00Z')
        })
      }
    )

    expect(beforeTrainer).toBe('requires-trainer')
    expect(afterTrainer).toBe('ready')
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

function waitForMutationEmission(
  observable: Observable<SetupStatus>,
  mutate: () => Promise<void>
): Promise<[SetupStatus, SetupStatus]> {
  return new Promise((resolve, reject) => {
    const emissions: SetupStatus[] = []
    let mutationStarted = false

    const subscription = observable.subscribe({
      next(value) {
        emissions.push(value)

        if (!mutationStarted) {
          mutationStarted = true
          void mutate().catch((error) => {
            reject(error)
            queueMicrotask(() => subscription.unsubscribe())
          })
          return
        }

        resolve([emissions[0], emissions[1]])
        queueMicrotask(() => subscription.unsubscribe())
      },
      error(error) {
        reject(error)
        queueMicrotask(() => subscription.unsubscribe())
      }
    })
  })
}
