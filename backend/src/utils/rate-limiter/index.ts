/**
 * In-memory per-IP sliding-window rate limiter.
 *
 * Tracks request timestamps per key and rejects requests
 * when the window limit is exceeded. Includes periodic
 * cleanup to prevent memory leaks from stale entries.
 */

interface RateLimiterOptions {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed through. */
  allowed: boolean;
  /** Seconds until the client can retry (0 when allowed). */
  retryAfterSeconds: number;
  /** Remaining requests in the current window. */
  remaining: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly requests = new Map<string, number[]>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Periodically evict stale entries to bound memory usage
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      this.windowMs * 2
    );
  }

  /**
   * Check whether a request identified by `key` (typically
   * the client IP) should be allowed or rejected.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(key);
    if (timestamps) {
      // Drop timestamps outside the current window
      timestamps = timestamps.filter((t) => t > windowStart);
      this.requests.set(key, timestamps);
    } else {
      timestamps = [];
      this.requests.set(key, timestamps);
    }

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0]!;
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        remaining: 0,
      };
    }

    timestamps.push(now);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: this.maxRequests - timestamps.length,
    };
  }

  /** Remove entries with no timestamps in the current window. */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.requests) {
      const filtered = timestamps.filter((t) => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }

  /** Stop the cleanup timer and clear all tracked state. */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}
