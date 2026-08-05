export type MapFailureBreakerOptions = Readonly<{
  threshold?: number;
  windowMs?: number;
}>;

export class MapFailureBreaker {
  private readonly failureTimes: number[] = [];
  private open = false;
  private readonly threshold: number;
  private readonly windowMs: number;

  constructor({ threshold = 1, windowMs = 10_000 }: MapFailureBreakerOptions = {}) {
    this.threshold = threshold;
    this.windowMs = windowMs;
  }

  recordFailure(now = Date.now()): boolean {
    if (this.open) return false;
    while (this.failureTimes[0] !== undefined && now - this.failureTimes[0] > this.windowMs) {
      this.failureTimes.shift();
    }
    this.failureTimes.push(now);
    if (this.failureTimes.length < this.threshold) return false;
    this.open = true;
    return true;
  }

  reset(): void {
    this.failureTimes.length = 0;
    this.open = false;
  }
}
