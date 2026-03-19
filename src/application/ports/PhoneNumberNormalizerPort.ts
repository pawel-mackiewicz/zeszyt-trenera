// The application layer hides phone parsing behind a port so use cases stay independent from any specific library or region policy.
export interface PhoneNumberNormalizerPort {
  normalizeInternational(phoneNumber: string): string | null
}
