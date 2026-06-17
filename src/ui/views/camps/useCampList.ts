import { onMounted, ref } from 'vue'

import type { CampListResult } from '@/read/ListCampsQuery'
import { useAppServices } from '@/ui/appServices'

export function useCampList() {
  const { queries } = useAppServices()
  const present = ref<CampListResult['present']>([])
  const past = ref<CampListResult['past']>([])
  const isLoading = ref(true)
  const loadError = ref(false)

  async function reload() {
    isLoading.value = true
    loadError.value = false

    try {
      const camps = await queries.listCamps.handle()
      present.value = camps.present
      past.value = camps.past
    } catch (error) {
      console.error('Failed to load camps', error)
      loadError.value = true
    } finally {
      isLoading.value = false
    }
  }

  function clearError() {
    loadError.value = false
  }

  onMounted(() => {
    void reload()
  })

  return {
    clearError,
    isLoading,
    loadError,
    past,
    present,
    reload
  }
}
