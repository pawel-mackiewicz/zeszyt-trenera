import { computed, onMounted, ref, watch, type Ref } from 'vue'

import type { CampParticipantCandidateListItem } from '@/read/ListCampParticipantCandidatesQuery'
import { useAppServices } from '@/ui/appServices'
import { AGE_FILTER_MAX, AGE_FILTER_MIN } from '@/ui/utils/ageRange'
import {
  sortMembers,
  type MemberSortDirection,
  type MemberSortField
} from '@/ui/utils/memberSort'

export type CampParticipantCandidateViewItem =
  CampParticipantCandidateListItem & {
    age: number
  }

type UseCampParticipantCandidatesOptions = {
  campId: Ref<string>
  locale: Ref<string>
}

export function useCampParticipantCandidates({
  campId,
  locale
}: UseCampParticipantCandidatesOptions) {
  const { queries } = useAppServices()
  const members = ref<CampParticipantCandidateListItem[]>([])
  const isLoading = ref(true)
  const loadError = ref(false)
  const searchQuery = ref('')
  const minAgeFilter = ref(AGE_FILTER_MIN)
  const maxAgeFilter = ref(AGE_FILTER_MAX)
  const memberSortField = ref<MemberSortField>('firstName')
  const memberSortDirection = ref<MemberSortDirection>('asc')
  let loadSequence = 0

  const membersWithAge = computed<CampParticipantCandidateViewItem[]>(() =>
    members.value.map((member) => ({
      ...member,
      age: calculateAge(member.dateOfBirth, new Date())
    }))
  )
  const filteredMembers = computed(() => {
    const matchingMembers = membersWithAge.value.filter(
      (member) => matchesSearch(member) && matchesAge(member)
    )
    const sortedMembers = sortMembers(matchingMembers, {
      direction: memberSortDirection.value,
      field: memberSortField.value,
      locale: locale.value
    })

    // What: keep unsigned candidates first as a frontend presentation rule. Why: the read query should expose facts, while this screen decides how coaches scan the list.
    return [
      ...sortedMembers.filter((member) => !member.alreadySigned),
      ...sortedMembers.filter((member) => member.alreadySigned)
    ]
  })
  const totalMemberCount = computed(() => members.value.length)
  const filteredMemberCount = computed(() => filteredMembers.value.length)

  function normalizeText(value: string): string {
    return value.toLocaleLowerCase(locale.value).trim()
  }

  function matchesSearch(member: CampParticipantCandidateViewItem): boolean {
    const query = normalizeText(searchQuery.value)
    const fullName = `${member.firstName} ${member.lastName}`

    return query.length === 0 || normalizeText(fullName).includes(query)
  }

  function matchesAge(member: CampParticipantCandidateViewItem): boolean {
    return member.age >= minAgeFilter.value && member.age <= maxAgeFilter.value
  }

  async function reload() {
    const requestedCampId = campId.value
    const currentLoad = ++loadSequence

    isLoading.value = true
    loadError.value = false

    try {
      const loadedMembers = requestedCampId
        ? await queries.listCampParticipantCandidates.handle({
            campId: requestedCampId
          })
        : []

      if (currentLoad === loadSequence) {
        members.value = loadedMembers
      }
    } catch (error) {
      if (currentLoad === loadSequence) {
        console.error('Failed to load camp participant candidates', error)
        members.value = []
        loadError.value = true
      }
    } finally {
      if (currentLoad === loadSequence) {
        isLoading.value = false
      }
    }
  }

  onMounted(() => {
    void reload()
  })

  watch(campId, () => {
    void reload()
  })

  return {
    filteredMemberCount,
    filteredMembers,
    isLoading,
    loadError,
    maxAgeFilter,
    memberSortDirection,
    memberSortField,
    minAgeFilter,
    reload,
    searchQuery,
    totalMemberCount
  }
}

function calculateAge(dateOfBirth: Date, now: Date): number {
  const birthDate = new Date(dateOfBirth)
  let age = now.getFullYear() - birthDate.getFullYear()
  const birthdayPassedThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() &&
      now.getDate() >= birthDate.getDate())

  if (!birthdayPassedThisYear) {
    age -= 1
  }

  return age
}
