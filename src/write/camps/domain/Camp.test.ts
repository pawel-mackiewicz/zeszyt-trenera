import { describe, expect, it } from 'vitest'

import {
  Camp,
  CampIdMismatchError,
  CampRegisteredDomainEvent,
  CampUpdatedDomainEvent,
  InvalidCampNameError,
  InvalidCampStartDateError
} from '@/write/camps/domain/Camp'
import { Money } from '@/write/shared/vo/Money'

const futureDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000)

const campPrice = () =>
  Money.create({
    amountMinor: 1200_00,
    currency: 'PLN'
  })

describe('Camp', () => {
  it('registers a camp with required properties and emits an event', () => {
    const id = 'camp-1'
    const startDate = futureDate()
    const price = campPrice()
    const beforeCreation = new Date()

    const [camp, event] = Camp.register(
      {
        name: '  Summer camp  ',
        note: '  Bring gloves  ',
        startDate,
        price
      },
      id
    )

    const afterCreation = new Date()

    expect(camp.id).toBe(id)
    expect(camp.name).toBe('Summer camp')
    expect(camp.note).toBe('Bring gloves')
    expect(camp.startDate).toEqual(startDate)
    expect(camp.price.toSnapshot()).toEqual(price.toSnapshot())
    expect(camp.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreation.getTime()
    )
    expect(camp.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreation.getTime()
    )
    expect(camp.updatedAt).toEqual(camp.createdAt)

    expect(event).toBeInstanceOf(CampRegisteredDomainEvent)
    expect(event.eventName).toBe('camp.registered')
    expect(event.payload).toEqual(camp.toSnapshot())
  })

  it('defaults missing note to an empty string', () => {
    const [camp] = Camp.register(
      {
        name: 'Summer camp',
        startDate: futureDate(),
        price: campPrice()
      },
      'camp-1'
    )

    expect(camp.note).toBe('')
  })

  it('keeps dates and money immutable when callers mutate shared references', () => {
    const startDate = futureDate()
    const [camp] = Camp.register(
      {
        name: 'Summer camp',
        startDate,
        price: campPrice()
      },
      'camp-1'
    )

    startDate.setUTCFullYear(2040)

    expect(camp.startDate).not.toEqual(startDate)

    const exposedStartDate = camp.startDate
    const snapshot = camp.toSnapshot()

    exposedStartDate.setUTCFullYear(2041)
    snapshot.startDate.setUTCFullYear(2042)
    snapshot.createdAt.setUTCFullYear(2043)
    snapshot.updatedAt.setUTCFullYear(2044)
    snapshot.price.amountMinor = 1

    expect(camp.startDate).not.toEqual(exposedStartDate)
    expect(camp.toSnapshot()).toEqual({
      id: 'camp-1',
      name: 'Summer camp',
      note: '',
      startDate: camp.startDate,
      price: camp.price.toSnapshot(),
      createdAt: camp.createdAt,
      updatedAt: camp.updatedAt
    })
    expect(camp.price.toSnapshot()).toEqual({
      amountMinor: 1200_00,
      currency: 'PLN'
    })
  })

  it('rehydrates and updates a camp while preserving id, price, and createdAt', () => {
    const createdAt = new Date('2026-03-01T10:00:00Z')
    const updatedAt = new Date('2026-03-02T10:00:00Z')
    const existingCamp = Camp.rehydrate({
      id: 'camp-1',
      name: 'Summer camp',
      note: '',
      startDate: new Date('2026-08-01T10:00:00Z'),
      price: {
        amountMinor: 1200_00,
        currency: 'PLN'
      },
      createdAt,
      updatedAt
    })
    const newStartDate = futureDate()
    const beforeUpdate = new Date()

    const [updatedCamp, event] = Camp.update(existingCamp, {
      campId: 'camp-1',
      name: '  Winter camp  ',
      note: '  Advanced group  ',
      startDate: newStartDate
    })

    const afterUpdate = new Date()

    expect(updatedCamp.id).toBe('camp-1')
    expect(updatedCamp.name).toBe('Winter camp')
    expect(updatedCamp.note).toBe('Advanced group')
    expect(updatedCamp.startDate).toEqual(newStartDate)
    expect(updatedCamp.price.toSnapshot()).toEqual({
      amountMinor: 1200_00,
      currency: 'PLN'
    })
    expect(updatedCamp.createdAt).toEqual(createdAt)
    expect(updatedCamp.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeUpdate.getTime()
    )
    expect(updatedCamp.updatedAt.getTime()).toBeLessThanOrEqual(
      afterUpdate.getTime()
    )
    expect(event).toBeInstanceOf(CampUpdatedDomainEvent)
    expect(event.eventName).toBe('camp.updated')
    expect(event.payload).toEqual(updatedCamp.toSnapshot())
  })

  it('rejects blank camp names', () => {
    expect(() =>
      Camp.register(
        {
          name: '   ',
          startDate: futureDate(),
          price: campPrice()
        },
        'camp-1'
      )
    ).toThrow(InvalidCampNameError)
  })

  it('rejects invalid and past start dates', () => {
    expect(() =>
      Camp.register(
        {
          name: 'Summer camp',
          startDate: new Date('invalid'),
          price: campPrice()
        },
        'camp-1'
      )
    ).toThrow(InvalidCampStartDateError)

    expect(() =>
      Camp.register(
        {
          name: 'Summer camp',
          startDate: new Date(Date.now() - 1),
          price: campPrice()
        },
        'camp-1'
      )
    ).toThrow(InvalidCampStartDateError)
  })

  it('applies the same name and start date rules during updates', () => {
    const [camp] = Camp.register(
      {
        name: 'Summer camp',
        startDate: futureDate(),
        price: campPrice()
      },
      'camp-1'
    )

    expect(() =>
      Camp.update(camp, {
        campId: 'camp-1',
        name: '',
        startDate: futureDate()
      })
    ).toThrow(InvalidCampNameError)

    expect(() =>
      Camp.update(camp, {
        campId: 'camp-1',
        name: 'Summer camp',
        startDate: new Date(Date.now() - 1)
      })
    ).toThrow(InvalidCampStartDateError)
  })

  it('rejects updates when the provided id does not match the loaded aggregate', () => {
    const [camp] = Camp.register(
      {
        name: 'Summer camp',
        startDate: futureDate(),
        price: campPrice()
      },
      'camp-1'
    )

    expect(() =>
      Camp.update(camp, {
        campId: 'camp-2',
        name: 'Summer camp',
        startDate: futureDate()
      })
    ).toThrow(CampIdMismatchError)
  })
})
