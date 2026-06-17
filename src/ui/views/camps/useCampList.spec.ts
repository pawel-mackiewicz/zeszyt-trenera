import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { useAppServices } from '@/ui/appServices'
import { useCampList } from '@/ui/views/camps/useCampList'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('useCampList', () => {
  let mockListCampsHandle: Mock
  let campList: ReturnType<typeof useCampList>

  beforeEach(() => {
    mockListCampsHandle = vi.fn().mockResolvedValue({
      present: [],
      past: []
    })
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        listCamps: {
          handle: mockListCampsHandle
        }
      }
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountComposable() {
    return mount(
      defineComponent({
        setup() {
          campList = useCampList()
          return () => null
        }
      })
    )
  }

  it('loads camps through the shared application query on mount', async () => {
    const presentCamp = {
      id: 'camp-present',
      name: 'Obóz letni',
      startDate: new Date(2026, 5, 16),
      finishDate: new Date(2026, 5, 25)
    }
    const pastCamp = {
      id: 'camp-past',
      name: 'Obóz zimowy',
      startDate: new Date(2025, 1, 1),
      finishDate: new Date(2025, 1, 11)
    }
    mockListCampsHandle.mockResolvedValue({
      present: [presentCamp],
      past: [pastCamp]
    })

    mountComposable()
    await flushPromises()

    expect(mockListCampsHandle).toHaveBeenCalledTimes(1)
    expect(campList.isLoading.value).toBe(false)
    expect(campList.loadError.value).toBe(false)
    expect(campList.present.value).toEqual([presentCamp])
    expect(campList.past.value).toEqual([pastCamp])
  })

  it('exposes a recoverable load error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockListCampsHandle.mockRejectedValue(new Error('IndexedDB blocked'))

    mountComposable()
    await flushPromises()

    expect(campList.isLoading.value).toBe(false)
    expect(campList.loadError.value).toBe(true)
    expect(campList.present.value).toEqual([])
    expect(campList.past.value).toEqual([])
  })

  it('reloads camps and clears the error flag before retrying', async () => {
    mockListCampsHandle
      .mockRejectedValueOnce(new Error('IndexedDB blocked'))
      .mockResolvedValueOnce({
        present: [
          {
            id: 'camp-present',
            name: 'Obóz letni',
            startDate: new Date(2026, 5, 16),
            finishDate: new Date(2026, 5, 25)
          }
        ],
        past: []
      })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mountComposable()
    await flushPromises()
    await campList.reload()

    expect(mockListCampsHandle).toHaveBeenCalledTimes(2)
    expect(campList.loadError.value).toBe(false)
    expect(campList.present.value).toHaveLength(1)
  })
})
