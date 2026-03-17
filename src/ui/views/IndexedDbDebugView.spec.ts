import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TrainerNotebookDb } from '@/infra/db'
import IndexedDbDebugView from '@/ui/views/IndexedDbDebugView.vue'

function createTestDbName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

describe('IndexedDbDebugView', () => {
  let database: TrainerNotebookDb

  beforeEach(() => {
    database = new TrainerNotebookDb(createTestDbName('indexeddb-debug-view'))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    database.close()
    await database.delete()
  })

  it('shows an empty state for tables without records', async () => {
    const wrapper = mount(IndexedDbDebugView, {
      props: {
        database
      }
    })

    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('clubs')
    })

    expect(wrapper.text()).toContain(
      'IndexedDB tables, as they exist in this browser.'
    )
    expect(wrapper.text()).toContain('events')
    expect(wrapper.text()).toContain('No records stored in this table yet.')
  })

  it('renders persisted rows and nested payloads', async () => {
    const foundingDate = new Date('1946-01-01T00:00:00.000Z')
    const createdAt = new Date('2025-03-17T14:00:00.000Z')
    const occurredAt = new Date('2025-03-17T14:01:00.000Z')

    await database.open()
    await database.clubs.add({
      id: 'club-1',
      name: 'ZKS Włókniarz Częstochowa',
      foundingDate,
      createdAt
    })
    await database.events.add({
      eventId: 'event-1',
      eventName: 'club.created',
      occurredAt,
      payload: {
        club: {
          id: 'club-1',
          name: 'ZKS Włókniarz Częstochowa',
          foundingDate,
          createdAt
        }
      }
    })

    const wrapper = mount(IndexedDbDebugView, {
      props: {
        database
      }
    })

    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.find('table').exists()).toBe(true)
    })

    expect(wrapper.text()).toContain('ZKS Włókniarz Częstochowa')
    expect(wrapper.text()).toContain('club.created')
    expect(wrapper.text()).toContain('1946-01-01T00:00:00.000Z')
    expect(wrapper.text()).toContain('"club"')
  })

  it('shows an error banner when the database snapshot cannot be read', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    vi.spyOn(database, 'open').mockRejectedValue(new Error('boom'))

    const wrapper = mount(IndexedDbDebugView, {
      props: {
        database
      }
    })

    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('IndexedDB could not be read.')
    })

    expect(wrapper.text()).toContain('IndexedDB could not be read.')
    expect(wrapper.text()).toContain('Failed to inspect IndexedDB tables.')
    expect(consoleError).toHaveBeenCalled()
  })
})
