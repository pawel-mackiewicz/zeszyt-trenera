import { ref, type Ref } from 'vue'

import type { ExternalCampParticipantRegistrationContext } from '@/read/GetExternalCampParticipantRegistrationContextQuery'
import { useAppServices } from '@/ui/appServices'
import {
  useCampParticipantRegistration,
  type CampParticipantRegistrationBaseErrorKey
} from './useCampParticipantRegistration'

export type RegisterExternalCampParticipantErrorKey =
  | CampParticipantRegistrationBaseErrorKey
  | 'invalidName'

type UseRegisterExternalCampParticipantOptions = {
  campId: Ref<string>
}

export function useRegisterExternalCampParticipant({
  campId
}: UseRegisterExternalCampParticipantOptions) {
  const { queries } = useAppServices()
  const firstName = ref('')
  const lastName = ref('')

  const registration = useCampParticipantRegistration<
    ExternalCampParticipantRegistrationContext,
    RegisterExternalCampParticipantErrorKey
  >({
    createPerson: () => {
      const normalizedFirstName = firstName.value.trim()
      const normalizedLastName = lastName.value.trim()

      return normalizedFirstName && normalizedLastName
        ? {
            person: {
              type: 'external',
              firstName: normalizedFirstName,
              lastName: normalizedLastName
            }
          }
        : {
            errorKey: 'invalidName'
          }
    },
    loadContext: () => {
      const requestedCampId = campId.value

      return requestedCampId
        ? queries.getExternalCampParticipantRegistrationContext.handle({
            campId: requestedCampId
          })
        : Promise.resolve(null)
    },
    loadErrorMessage:
      'Failed to load external camp participant registration context',
    watchSources: campId
  })

  return {
    ...registration,
    firstName,
    lastName
  }
}
