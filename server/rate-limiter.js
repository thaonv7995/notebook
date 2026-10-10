/**
 * Shared in-memory fixed-window rate limiter.
 *
 * Suitable for a single Node.js process. For multi-instance deployments,
 * replace the Map-backed store with a shared store such as Redis.
 */

const DEFAULT_MAX_RECORDS = 10_000;

function toBoundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(normalized, max));
}

function setRateLimitHeaders(res, limit, remaining, resetAt) {
  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(remaining));
  res.setHeader('RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}

/**
 * Creates an Express rate-limit middleware with a bounded in-memory store.
 *
 * @param {Object} options
 * @param {string} options.name Identifier used only for diagnostics.
 * @param {number|string} options.windowMs Fixed-window duration.
 * @param {number|string} options.maxRequests Maximum requests per window.
 * @param {number} [options.minWindowMs=10000] Minimum accepted window.
 * @param {number} [options.maxWindowMs=3600000] Maximum accepted window.
 * @param {number} [options.maxAllowedRequests=2000] Configuration safety cap.
 * @param {number} [options.maxRecords=10000] Maximum identities retained.
 * @param {(req: import('express').Request) => string} [options.keyGenerator]
 * @param {(context: Object) => string} [options.message]
 * @param {boolean} [options.silent=false] Return an empty response when limited.
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter({
  name = 'request',
  windowMs = 60_000,
  maxRequests = 60,
  minWindowMs = 10_000,
  maxWindowMs = 60 * 60_000,
  maxAllowedRequests = 2000,
  maxRecords = DEFAULT_MAX_RECORDS,
  keyGenerator,
  message,
  silent = false
} = {}) {
  const resolvedWindowMs = toBoundedNumber(
    windowMs,
    60_000,
    minWindowMs,
    maxWindowMs
  );
  const resolvedMaxRequests = toBoundedNumber(
    maxRequests,
    60,
    1,
    maxAllowedRequests
  );
  const resolvedMaxRecords = toBoundedNumber(
    maxRecords,
    DEFAULT_MAX_RECORDS,
    100,
    100_000
  );
  const records = new Map();

  function resolveIdentity(req) {
    if (typeof keyGenerator === 'function') {
      const customKey = keyGenerator(req);
      if (customKey != null && String(customKey)) return String(customKey);
    }

    if (req.user?.id != null) return `user:${req.user.id}`;
    return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  }

  function cleanup(now) {
    if (records.size < resolvedMaxRecords) return;

    for (const [key, record] of records) {
      if (now >= record.resetAt) records.delete(key);
    }

    if (records.size >= resolvedMaxRecords) {
      const overflow = records.size - resolvedMaxRecords + 1;
      const iterator = records.keys();
      for (let index = 0; index < overflow; index += 1) {
        const entry = iterator.next();
        if (entry.done) break;
        records.delete(entry.value);
      }
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    cleanup(now);

    const identity = resolveIdentity(req);
    const existing = records.get(identity);
    const record = !existing || now >= existing.resetAt
      ? { count: 0, resetAt: now + resolvedWindowMs }
      : existing;

    record.count += 1;
    records.set(identity, record);

    const remaining = Math.max(0, resolvedMaxRequests - record.count);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((record.resetAt - now) / 1000)
    );

    setRateLimitHeaders(
      res,
      resolvedMaxRequests,
      remaining,
      record.resetAt
    );

    if (record.count <= resolvedMaxRequests) {
      next();
      return;
    }

    res.setHeader('Retry-After', String(retryAfterSeconds));

    if (silent) {
      res.status(204).end();
      return;
    }

    const context = {
      name,
      limit: resolvedMaxRequests,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSeconds
    };
    const error = typeof message === 'function'
      ? message(context)
      : `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfterSeconds} giây.`;

    res.status(429).json({
      ok: false,
      error,
      code: 'RATE_LIMITED',
      retryAfterSeconds
    });
  };
}
