import type { UseCase } from '@/write/shared/UseCase'
import type { PaymentReminderMessageBuilderPort } from '@/write/memberships/application/ports/PaymentReminderMessageBuilderPort'
import type { MemberRepoPort } from '@/write/members/application/MemberRepoPort'
import type { PaymentReminderSenderPort } from '@/write/memberships/application/ports/PaymentReminderSenderPort'
import type { SmsComposerPort } from '@/write/memberships/application/ports/SmsComposerPort'
import type { SendMembershipPaymentReminderCommand } from '@/write/memberships/application/requests/SendMembershipPaymentReminderCommand'
import { MemberNotFoundError } from '@/write/members/domain/Member'

export class MemberPhoneNumberMissingError extends Error {
  public constructor(memberId: string) {
    super(`Member ${memberId} has no phone number.`)
    this.name = 'MemberPhoneNumberMissingError'
  }
}

export class PaymentReminderSenderMissingError extends Error {
  public constructor() {
    super('Payment reminder sender identity is missing.')
    this.name = 'PaymentReminderSenderMissingError'
  }
}

export class SendMembershipPaymentReminderUseCase implements UseCase<SendMembershipPaymentReminderCommand> {
  public constructor(
    private readonly memberRepo: MemberRepoPort,
    private readonly paymentReminderSender: PaymentReminderSenderPort,
    private readonly paymentReminderMessageBuilder: PaymentReminderMessageBuilderPort,
    private readonly smsComposer: SmsComposerPort
  ) {}

  public async handle(
    request: SendMembershipPaymentReminderCommand
  ): Promise<void> {
    const member = await this.memberRepo.findById(request.memberId)

    if (member === null) {
      throw new MemberNotFoundError(request.memberId)
    }

    const phoneNumber = member.phoneNumber?.value

    if (!phoneNumber) {
      throw new MemberPhoneNumberMissingError(request.memberId)
    }

    const sender = await this.paymentReminderSender.load()

    if (sender === null) {
      throw new PaymentReminderSenderMissingError()
    }

    // Why: the use case delegates copy generation to a dedicated port so reminder wording policy can evolve independently from orchestration and UI concerns.
    await this.smsComposer.openDraft({
      phoneNumber,
      message: this.paymentReminderMessageBuilder.build({
        trainerName: sender.trainerName,
        clubName: sender.clubName,
        coveredMonth: request.coveredMonth,
        locale: request.locale
      })
    })
  }
}
