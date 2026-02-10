/**
 * Simple sliding-window rate limiter for API calls.
 * ML limit: 1500 req/min
 */
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.timestamps.push(Date.now());
  }
}

// ML: 1500 requests per minute
export const mlRateLimiter = new RateLimiter(1500, 60_000);
