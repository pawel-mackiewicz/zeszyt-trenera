import type { PhoneNumberNormalizerPort } from '@/application/ports/PhoneNumberNormalizerPort'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export class LibPhoneNumberNormalizer implements PhoneNumberNormalizerPort {
  public normalizeInternational(phoneNumber: string): string | null {
    // Registration fields should reject copied prose around a number because local-first persistence must only store an explicitly entered phone value.
    const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, {
      extract: false
    })

    if (parsedPhoneNumber == null || !parsedPhoneNumber.isValid()) {
      return null
    }

    return parsedPhoneNumber.number
  }
}
