import type { ClockPort } from '@/write/application/ports/ClockPort'

export class SystemClock implements ClockPort {
  public now(): Date {
    return new Date()
  }
}
