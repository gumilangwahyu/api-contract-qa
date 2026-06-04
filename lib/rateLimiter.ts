type Entry = { count: number; resetAt: number }

const stores: Map<string, Entry> = new Map()
let lastCleanup = Date.now()

/**
 * Basic rate limiter:
 * key: unique key (project:id or ip:addr)
 * limit: allowed requests
 * windowMs: window in ms
 *
 * Returns remaining count; throws if exceeded.
 */
export function checkRateLimit(key: string, limit = 100, windowMs = 60_000) {
  const now = Date.now()

  // Periodically clean up expired entries to prevent memory leaks (DoS protection)
  if (now - lastCleanup > 300_000 || stores.size > 10000) {
    for (const [k, v] of stores.entries()) {
      if (now > v.resetAt) {
        stores.delete(k)
      }
    }
    // Hard cap size limit to prevent memory exhaustion under DDoS
    if (stores.size > 10000) {
      stores.clear()
    }
    lastCleanup = now
  }

  const entry = stores.get(key)
  if (!entry || now > entry.resetAt) {
    stores.set(key, { count: 1, resetAt: now + windowMs })
    return { remaining: limit - 1, resetAt: now + windowMs }
  }
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    throw { status: 429, message: 'Rate limit exceeded', retryAfter }
  }
  entry.count += 1
  stores.set(key, entry)
  return { remaining: limit - entry.count, resetAt: entry.resetAt }
}