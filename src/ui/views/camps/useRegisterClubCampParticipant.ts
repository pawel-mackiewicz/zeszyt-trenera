import type { Ref } from 'vue'

import type { ClubCampParticipantRegistrationContext } from '@/read/GetClubCampParticipantRegistrationContextQuery'
import { useAppServices } from '@/ui/appServices'
import {
  useCampParticipantRegistration,
  type CampParticipantRegistrationBaseErrorKey
} from './useCampParticipantRegistration'

export type RegisterClubCampParticipantErrorKey =
  CampParticipantRegistrationBaseErrorKey

type UseRegisterClubCampParticipantOptions = {
  campId: Ref<string>
  memberId: Ref<string>
}

export function useRegisterClubCampParticipant({
  campId,
  memberId
}: UseRegisterClubCampParticipantOptions) {
  const { queries } = useAppServices()

  return useCampParticipantRegistration<
    ClubCampParticipantRegistrationContext,
    RegisterClubCampParticipantErrorKey
  >({
    createPerson: (context) => ({
      person: {
        type: 'club',
        memberId: context.member.id
      }
    }),
    loadContext: () => {
      const requestedCampId = campId.value
      const requestedMemberId = memberId.value

      return requestedCampId && requestedMemberId
        ? queries.getClubCampParticipantRegistrationContext.handle({
            campId: requestedCampId,
            memberId: requestedMemberId
          })
        : Promise.resolve(null)
    },
    loadErrorMessage:
      'Failed to load club camp participant registration context',
    watchSources: [campId, memberId]
  })
}
