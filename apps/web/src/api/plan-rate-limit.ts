type RateLimitEntry = Readonly<{
  count: number;
  resetAt: number;
}>;

const entries = new Map<string, RateLimitEntry>();

export function checkPlanRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    entries.set(key, next);
    return { allowed: true, remaining: limit - 1, resetAt: next.resetAt };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }
  const next = { count: current.count + 1, resetAt: current.resetAt };
  entries.set(key, next);
  return { allowed: true, remaining: limit - next.count, resetAt: next.resetAt };
}

export function resetPlanRateLimits() {
  entries.clear();
}