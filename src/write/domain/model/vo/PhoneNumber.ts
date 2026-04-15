import { parsePhoneNumberFromString } from 'libphonenumber-js'

export class PhoneNumber {
  private constructor(public readonly value: string) {}

  public static create(rawPhoneNumber: string): PhoneNumber {
    // One value object owns phone normalization so duplicate checks, stored snapshots, and emitted events all share the same canonical identity.
    const parsedPhoneNumber = parsePhoneNumberFromString(rawPhoneNumber, {
      extract: false
    })

    if (parsedPhoneNumber == null || !parsedPhoneNumber.isValid()) {
      throw new InvalidPhoneNumberError(rawPhoneNumber)
    }

    return new PhoneNumber(parsedPhoneNumber.number)
  }

  public toString(): string {
    return this.value
  }
}

export class InvalidPhoneNumberError extends Error {
  public constructor(phoneNumber: string) {
    super(`Phone number is invalid: ${phoneNumber}`)
    this.name = 'InvalidPhoneNumberError'
  }
}
