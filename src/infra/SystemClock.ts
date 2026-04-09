import type { ClockPort } from '@/application/ports/ClockPort'

export class SystemClock implements ClockPort {
  public now(): Date {
    return new Date()
  }
}
