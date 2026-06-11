import { computed, onMounted, ref, watch, type Ref } from 'vue'

import type {
  CampDetails,
  CampDetailsActiveParticipantListItem,
  CampDetailsParticipantGroups,
  CampDetailsParticipantListItem,
  CampDetailsResignedParticipantListItem
} from '@/read/GetCampDetailsQuery'
import { useAppServices } from '@/ui/appServices'
import { AGE_FILTER_MAX, AGE_FILTER_MIN } from '@/ui/utils/ageRange'
import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'

type CampDetailsParticipant =
  | CampDetailsActiveParticipantListItem
  | CampDetailsResignedParticipantListItem

type UseCampDetailsOptions = {
  campId: Ref<string>
  locale: Ref<string>
}

export function useCampDetails({ campId, locale }: UseCampDetailsOptions) {
  const { queries } = useAppServices()
  const details = ref<CampDetails | null>(null)
  const isLoading = ref(true)
  const loadError = ref(false)
  const searchQuery = ref('')
  const minAgeFilter = ref(AGE_FILTER_MIN)
  const maxAgeFilter = ref(AGE_FILTER_MAX)
  const memberSortField = ref<MemberSortField>('firstName')
  const memberSortDirection = ref<MemberSortDirection>('asc')
  let loadSequence = 0

  const camp = computed(() => details.value?.camp ?? null)
  const totalParticipantCount = computed(() =>
    details.value === null ? 0 : countParticipants(details.value.participants)
  )
  const filteredParticipants = computed<CampDetailsParticipantGroups>(() => {
    if (details.value === null) {
      return {
        registered: [],
        fullyPaid: [],
        resigned: []
      }
    }

    return {
      registered: filterAndSortParticipants(
        details.value.participants.registered
      ),
      fullyPaid: filterAndSortParticipants(
        details.value.participants.fullyPaid
      ),
      resigned: filterAndSortParticipants(details.value.participants.resigned)
    }
  })
  const filteredParticipantCount = computed(() =>
    countParticipants(filteredParticipants.value)
  )
  const notFound = computed(
    () => !isLoading.value && !loadError.value && details.value === null
  )

  function countParticipants(groups: {
    registered: readonly CampDetailsParticipant[]
    fullyPaid: readonly CampDetailsParticipant[]
    resigned: readonly CampDetailsParticipant[]
  }): number {
    return (
      groups.registered.length +
      groups.fullyPaid.length +
      groups.resigned.length
    )
  }

  function normalizeText(value: string): string {
    return value.toLocaleLowerCase(locale.value).trim()
  }

  function matchesSearch(participant: CampDetailsParticipantListItem): boolean {
    const query = normalizeText(searchQuery.value)

    return (
      query.length === 0 ||
      normalizeText(participant.displayName).includes(query)
    )
  }

  function matchesAge(participant: CampDetailsParticipantListItem): boolean {
    const ageFilterIsDefault =
      minAgeFilter.value === AGE_FILTER_MIN &&
      maxAgeFilter.value === AGE_FILTER_MAX

    if (participant.age === null) {
      return ageFilterIsDefault
    }

    return (
      participant.age >= minAgeFilter.value &&
      participant.age <= maxAgeFilter.value
    )
  }

  function compareText(left: string, right: string): number {
    return left.localeCompare(right, locale.value)
  }

  function compareNullableNumber(
    left: number | null,
    right: number | null
  ): number {
    if (left === null && right === null) {
      return 0
    }

    if (left === null) {
      return 1
    }

    if (right === null) {
      return -1
    }

    return left - right
  }

  function compareParticipants(
    left: CampDetailsParticipant,
    right: CampDetailsParticipant
  ): number {
    const directionMultiplier = memberSortDirection.value === 'asc' ? 1 : -1
    const identityComparison =
      compareText(left.lastName, right.lastName) ||
      compareText(left.firstName, right.firstName) ||
      compareText(left.id, right.id)

    if (memberSortField.value === 'firstName') {
      return (
        (compareText(left.firstName, right.firstName) ||
          compareText(left.lastName, right.lastName) ||
          compareText(left.id, right.id)) * directionMultiplier
      )
    }

    if (memberSortField.value === 'dateOfBirth') {
      return (
        compareNullableNumber(left.age, right.age) * directionMultiplier ||
        identityComparison
      )
    }

    if (memberSortField.value === 'joinedAt') {
      return (
        (left.addedAt.getTime() - right.addedAt.getTime()) *
          directionMultiplier || identityComparison
      )
    }

    return identityComparison * directionMultiplier
  }

  function filterAndSortParticipants<
    TParticipant extends CampDetailsParticipant
  >(participants: readonly TParticipant[]): TParticipant[] {
    return participants
      .filter(
        (participant) => matchesSearch(participant) && matchesAge(participant)
      )
      .sort(compareParticipants)
  }

  async function reload() {
    const requestedCampId = campId.value
    const currentLoad = ++loadSequence

    isLoading.value = true
    loadError.value = false

    try {
      const loadedDetails = requestedCampId
        ? await queries.getCampDetails.handle({ campId: requestedCampId })
        : null

      if (currentLoad === loadSequence) {
        details.value = loadedDetails
      }
    } catch (error) {
      if (currentLoad === loadSequence) {
        console.error('Failed to load camp details', error)
        details.value = null
        loadError.value = true
      }
    } finally {
      if (currentLoad === loadSequence) {
        isLoading.value = false
      }
    }
  }

  function clearError() {
    loadError.value = false
  }

  onMounted(() => {
    void reload()
  })

  watch(campId, () => {
    void reload()
  })

  return {
    camp,
    clearError,
    filteredParticipantCount,
    filteredParticipants,
    isLoading,
    loadError,
    maxAgeFilter,
    memberSortDirection,
    memberSortField,
    minAgeFilter,
    notFound,
    reload,
    searchQuery,
    totalParticipantCount
  }
}
