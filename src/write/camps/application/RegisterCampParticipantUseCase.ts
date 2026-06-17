import type { CampRepoPort } from '@/write/camps/application/ports/CampRepoPort'
import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { RegisterCampParticipantCommand } from '@/write/camps/application/requests/RegisterCampParticipantCommand'
import { CampParticipant } from '@/write/camps/domain/CampParticipant'
import type { DomainEvent } from '@/write/shared/events/DomainEvent'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UseCase } from '@/write/shared/UseCase'
import { Money } from '@/write/shared/vo/Money'

export class RegisterCampParticipantUseCase implements UseCase<RegisterCampParticipantCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly campRepo: CampRepoPort,
    private readonly campParticipantRepo: CampParticipantRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterCampParticipantCommand): Promise<void> {
    await this.uow.execute(async () => {
      // eslint-disable-next-line prefer-const
      let [participant, registeredEvent] = this.registerParticipant(dto)
      const events: DomainEvent[] = [registeredEvent]

      await this.ensureCampExists(participant.campId)
      await this.ensureParticipantIsNotRegistered(
        participant.campId,
        participant.person
      )

      if (dto.initialDiscount) {
        const [discountedParticipant, discountEvent] =
          participant.applyDiscount({
            id: this.idGenerator.generate(),
            amount: Money.create(dto.initialDiscount.amount),
            reason: dto.initialDiscount.reason
          })

        participant = discountedParticipant
        events.push(discountEvent)
      }

      if (dto.initialPayment) {
        const [paidParticipant, paymentEvent] = participant.registerPayment({
          id: this.idGenerator.generate(),
          amount: Money.create(dto.initialPayment.amount),
          note: dto.initialPayment.note
        })

        participant = paidParticipant
        events.push(paymentEvent)
      }

      await this.campParticipantRepo.save(participant)

      for (const event of events) {
        await this.eventRepo.save(event)
      }
    })
  }

  private registerParticipant(dto: RegisterCampParticipantCommand) {
    // Keep command conversion and ID allocation in the application layer.
    return CampParticipant.register(
      {
        campId: dto.campId,
        person: dto.person,
        totalAmountDue: Money.create(dto.totalAmountDue)
      },
      this.idGenerator.generate()
    )
  }

  private async ensureCampExists(campId: string): Promise<void> {
    if (!(await this.campRepo.existsById(campId))) {
      throw new CampNotFoundForParticipantRegistrationError(campId)
    }
  }

  private async ensureParticipantIsNotRegistered(
    campId: string,
    person: CampParticipant['person']
  ): Promise<void> {
    if (
      await this.campParticipantRepo.existsByCampIdAndPerson(campId, person)
    ) {
      throw new CampParticipantAlreadyRegisteredError(campId)
    }
  }
}

export class CampNotFoundForParticipantRegistrationError extends Error {
  public constructor(campId: string) {
    super(`Camp not found for participant registration: ${campId}`)
    this.name = 'CampNotFoundForParticipantRegistrationError'
  }
}

export class CampParticipantAlreadyRegisteredError extends Error {
  public constructor(campId: string) {
    super(`Camp participant is already registered for camp: ${campId}`)
    this.name = 'CampParticipantAlreadyRegisteredError'
  }
}
