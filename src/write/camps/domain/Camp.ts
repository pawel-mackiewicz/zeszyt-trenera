import { DomainEvent } from '@/write/shared/events/DomainEvent'
import { copyDate } from '@/write/shared/DateUtils'
import { Money, type MoneySnapshot } from '@/write/shared/vo/Money'

const assertValidName = (name: string): string => {
  const normalizedName = name.trim()

  if (normalizedName.length === 0) {
    throw new InvalidCampNameError(name)
  }

  return normalizedName
}

const assertValidNote = (note: string): string => note.trim()

const assertValidStartDate = (startDate: Date): Date => {
  const now = new Date()

  if (
    !(startDate instanceof Date) ||
    Number.isNaN(startDate.getTime()) ||
    startDate <= now
  ) {
    throw new InvalidCampStartDateError()
  }

  return copyDate(startDate)
}

const assertValidFinishDate = (finishDate: Date, startDate: Date): Date => {
  if (
    !(finishDate instanceof Date) ||
    Number.isNaN(finishDate.getTime()) ||
    finishDate <= startDate
  ) {
    throw new InvalidCampFinishDateError()
  }

  return copyDate(finishDate)
}

export type RegisterCampInput = {
  name: string
  note?: string
  startDate: Date
  finishDate: Date
  price: Money
}

export type UpdateCampInput = {
  campId: string
  name: string
  note?: string
  startDate: Date
  finishDate: Date
}

type CampStateInput = {
  name: string
  note: string
  startDate: Date
  finishDate: Date
  price: Money
  updatedAt?: Date
}

export type CampSnapshot = {
  id: string
  name: string
  note: string
  startDate: Date
  finishDate: Date
  price: MoneySnapshot
  createdAt: Date
  updatedAt: Date
}

export class Camp {
  public readonly id: string

  private _name: string
  private _note: string
  private _startDate: Date
  private _finishDate: Date
  private _price: Money
  private _createdAt: Date
  private _updatedAt: Date

  private constructor(
    input: CampStateInput,
    id: string,
    createdAt: Date = new Date()
  ) {
    this.id = id
    this._name = input.name
    this._note = input.note
    this._startDate = copyDate(input.startDate)
    this._finishDate = copyDate(input.finishDate)
    this._price = input.price
    this._createdAt = copyDate(createdAt)
    this._updatedAt = copyDate(input.updatedAt ?? createdAt)
  }

  public static register(
    input: RegisterCampInput,
    id: string
  ): [Camp, CampRegisteredDomainEvent] {
    const createdAt = new Date()
    const camp = new Camp(
      {
        name: assertValidName(input.name),
        note: assertValidNote(input.note ?? ''),
        startDate: assertValidStartDate(input.startDate),
        finishDate: assertValidFinishDate(input.finishDate, input.startDate),
        price: input.price,
        updatedAt: createdAt
      },
      id,
      createdAt
    )
    const event = new CampRegisteredDomainEvent(camp.toSnapshot())

    return [camp, event]
  }

  public static rehydrate(snapshot: CampSnapshot): Camp {
    return new Camp(
      {
        name: snapshot.name,
        note: snapshot.note,
        startDate: snapshot.startDate,
        finishDate: snapshot.finishDate,
        price: Money.create(snapshot.price),
        updatedAt: snapshot.updatedAt
      },
      snapshot.id,
      snapshot.createdAt
    )
  }

  public static update(
    existingCamp: Camp,
    input: UpdateCampInput
  ): [Camp, CampUpdatedDomainEvent] {
    if (input.campId !== existingCamp.id) {
      throw new CampIdMismatchError(existingCamp.id, input.campId)
    }

    const updatedCamp = new Camp(
      {
        name: assertValidName(input.name),
        note: assertValidNote(input.note ?? ''),
        startDate: assertValidStartDate(input.startDate),
        finishDate: assertValidFinishDate(input.finishDate, input.startDate),
        price: existingCamp.price,
        updatedAt: new Date()
      },
      existingCamp.id,
      existingCamp.createdAt
    )
    const event = new CampUpdatedDomainEvent(updatedCamp.toSnapshot())

    return [updatedCamp, event]
  }

  public toSnapshot(): CampSnapshot {
    return {
      id: this.id,
      name: this.name,
      note: this.note,
      startDate: this.startDate,
      finishDate: this.finishDate,
      price: this.price.toSnapshot(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  public get name() {
    return this._name
  }

  public get note() {
    return this._note
  }

  public get startDate() {
    return copyDate(this._startDate)
  }

  public get finishDate() {
    return copyDate(this._finishDate)
  }

  public get price() {
    return Money.create(this._price.toSnapshot())
  }

  public get createdAt() {
    return copyDate(this._createdAt)
  }

  public get updatedAt() {
    return copyDate(this._updatedAt)
  }
}

export class CampRegisteredDomainEvent extends DomainEvent<CampSnapshot> {
  public readonly eventName = 'camp.registered'

  public constructor(camp: CampSnapshot) {
    super(camp)
  }
}

export class CampUpdatedDomainEvent extends DomainEvent<CampSnapshot> {
  public readonly eventName = 'camp.updated'

  public constructor(camp: CampSnapshot) {
    super(camp)
  }
}

export class CampNotFoundError extends Error {
  public constructor(campId: string) {
    super(`Camp not found: ${campId}`)
    this.name = 'CampNotFoundError'
  }
}

export class CampIdMismatchError extends Error {
  public constructor(expectedCampId: string, providedCampId: string) {
    super(
      `Camp update id mismatch. Expected ${expectedCampId}, got ${providedCampId}`
    )
    this.name = 'CampIdMismatchError'
  }
}

export class InvalidCampNameError extends Error {
  public constructor(name: string) {
    super(`Camp name is invalid: ${name}`)
    this.name = 'InvalidCampNameError'
  }
}

export class InvalidCampFinishDateError extends Error {
  public constructor() {
    super('Camp finish date is invalid')
    this.name = 'InvalidCampFinishDateError'
  }
}

export class InvalidCampStartDateError extends Error {
  public constructor() {
    super('Camp start date is invalid')
    this.name = 'InvalidCampStartDateError'
  }
}
