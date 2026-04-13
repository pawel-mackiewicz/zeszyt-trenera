import { beforeEach, describe, expect, it } from 'vitest'

import type {
  BuildPaymentReminderMessageInput,
  PaymentReminderMessageBuilderPort
} from '@/application/ports/PaymentReminderMessageBuilderPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type {
  PaymentReminderSender,
  PaymentReminderSenderPort
} from '@/application/ports/PaymentReminderSenderPort'
import type {
  SmsComposerPort,
  SmsDraft
} from '@/application/ports/SmsComposerPort'
import {
  MemberPhoneNumberMissingError,
  PaymentReminderSenderMissingError,
  SendMembershipPaymentReminderUseCase
} from '@/application/SendMembershipPaymentReminderUseCase'
import { Member, MemberNotFoundError } from '@/domain/model/Member'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'

class FakeMemberRepo implements MemberRepoPort {
  public readonly membersById = new Map<string, Member>()

  async save(member: Member): Promise<void> {
    this.membersById.set(member.id, member)
  }

  async update(member: Member): Promise<void> {
    this.membersById.set(member.id, member)
  }

  async findById(memberId: string): Promise<Member | null> {
    return this.membersById.get(memberId) ?? null
  }

  async existsById(memberId: string): Promise<boolean> {
    return this.membersById.has(memberId)
  }

  async existsByNameAndBirthDate(): Promise<boolean> {
    return false
  }
}

class FakePaymentReminderSenderPort implements PaymentReminderSenderPort {
  public sender: PaymentReminderSender | null = {
    trainerName: 'Jane Doe',
    clubName: 'Tiger Club'
  }

  async load(): Promise<PaymentReminderSender | null> {
    return this.sender
  }
}

class FakeSmsComposerPort implements SmsComposerPort {
  public readonly drafts: SmsDraft[] = []

  async openDraft(draft: SmsDraft): Promise<void> {
    this.drafts.push(draft)
  }
}

class FakePaymentReminderMessageBuilderPort implements PaymentReminderMessageBuilderPort {
  public readonly buildCalls: BuildPaymentReminderMessageInput[] = []

  build(input: BuildPaymentReminderMessageInput): string {
    this.buildCalls.push(input)

    return `REMINDER:${input.locale}:${input.coveredMonth}`
  }
}

describe('SendMembershipPaymentReminderUseCase', () => {
  let memberRepo: FakeMemberRepo
  let paymentReminderSender: FakePaymentReminderSenderPort
  let paymentReminderMessageBuilder: FakePaymentReminderMessageBuilderPort
  let smsComposer: FakeSmsComposerPort
  let useCase: SendMembershipPaymentReminderUseCase

  beforeEach(() => {
    memberRepo = new FakeMemberRepo()
    paymentReminderSender = new FakePaymentReminderSenderPort()
    paymentReminderMessageBuilder = new FakePaymentReminderMessageBuilderPort()
    smsComposer = new FakeSmsComposerPort()
    useCase = new SendMembershipPaymentReminderUseCase(
      memberRepo,
      paymentReminderSender,
      paymentReminderMessageBuilder,
      smsComposer
    )
  })

  it('builds a reminder message through the message-builder port before opening SMS', async () => {
    await memberRepo.save(createMember('member-1', '+48 111 222 333'))

    await useCase.handle({
      memberId: 'member-1',
      coveredMonth: '2026-10',
      locale: 'en'
    })

    expect(smsComposer.drafts).toEqual([
      {
        phoneNumber: '+48111222333',
        message: 'REMINDER:en:2026-10'
      }
    ])
    expect(paymentReminderMessageBuilder.buildCalls).toEqual([
      {
        trainerName: 'Jane Doe',
        clubName: 'Tiger Club',
        coveredMonth: '2026-10',
        locale: 'en'
      }
    ])
  })

  it('passes locale as-is to the message-builder port', async () => {
    await memberRepo.save(createMember('member-1', '+48 111 222 333'))

    await useCase.handle({
      memberId: 'member-1',
      coveredMonth: '2026-10',
      locale: 'pl-PL'
    })

    expect(paymentReminderMessageBuilder.buildCalls[0]).toMatchObject({
      locale: 'pl-PL'
    })
  })

  it('throws when the member does not exist', async () => {
    await expect(
      useCase.handle({
        memberId: 'missing-member',
        coveredMonth: '2026-10',
        locale: 'en'
      })
    ).rejects.toThrow(MemberNotFoundError)

    expect(paymentReminderMessageBuilder.buildCalls).toHaveLength(0)
    expect(smsComposer.drafts).toHaveLength(0)
  })

  it('throws when the member has no phone number', async () => {
    await memberRepo.save(createMember('member-1'))

    await expect(
      useCase.handle({
        memberId: 'member-1',
        coveredMonth: '2026-10',
        locale: 'en'
      })
    ).rejects.toThrow(MemberPhoneNumberMissingError)

    expect(paymentReminderMessageBuilder.buildCalls).toHaveLength(0)
    expect(smsComposer.drafts).toHaveLength(0)
  })

  it('throws when trainer/club sender identity is missing', async () => {
    await memberRepo.save(createMember('member-1', '+48 111 222 333'))
    paymentReminderSender.sender = null

    await expect(
      useCase.handle({
        memberId: 'member-1',
        coveredMonth: '2026-10',
        locale: 'en'
      })
    ).rejects.toThrow(PaymentReminderSenderMissingError)

    expect(paymentReminderMessageBuilder.buildCalls).toHaveLength(0)
    expect(smsComposer.drafts).toHaveLength(0)
  })
})

function createMember(memberId: string, phoneNumber?: string): Member {
  const [member] = Member.register(
    {
      firstName: 'alex',
      lastName: 'silva',
      ...(phoneNumber === undefined
        ? {}
        : {
            phoneNumber: PhoneNumber.create(phoneNumber)
          }),
      dateOfBirth: new Date('2010-01-01T00:00:00Z')
    },
    memberId
  )

  return member
}
