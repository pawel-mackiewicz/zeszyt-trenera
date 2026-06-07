import type { ClockPort } from '@/write/shared/ClockPort'

export class SystemClock implements ClockPort {
  public now(): Date {
    return new Date()
  }
}
