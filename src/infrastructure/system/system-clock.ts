import type { Clock } from "@core/application/ports";

/** Real wall-clock. Use cases receive this; tests pass a fake. */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export const systemClock = new SystemClock();
