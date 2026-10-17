/**
 * Bounded In-Memory Rate Limiter for Serverless Handlers
 * 
 * ARCHITECTURE NOTE:
 * In serverless environments (such as Vercel Serverless Functions), this in-memory store
 * is process-local to the running instance/container. It provides local cost and flood
 * protection per execution container, but is NOT a distributed global rate limiter across
 * concurrent multi-region serverless instances.
 * 
 * MEMORY POLICY:
 * - Stale records whose time window has expired are automatically pruned.
 * - A strict upper bound (maxEntries) is enforced.
 * - When capacity is reached and all current entries are active (unexpired), the limiter
 *   uses an explicit capacity rejection policy (HTTP 503) rather than silently evicting
 *   active clients (which would reset their limits and permit bypass).
 */

/**
 * Extracts client IP safely from request headers.
 * Uses trusted Vercel platform headers before falling back.
 * 
 * @param {import('http').IncomingMessage} req
 * @returns {string} Sanitized client IP string
 */
export function getClientIp(req) {
  if (!req || !req.headers) return '127.0.0.1';

  // 1. x-real-ip is injected directly by Vercel's edge proxy and cannot be forged by clients
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  // 2. x-forwarded-for: the first IP in the list represents the initial client
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // 3. Fallback to direct socket address
  const socketIp = req.socket?.remoteAddress;
  if (typeof socketIp === 'string' && socketIp.trim()) {
    return socketIp.trim();
  }

  return '127.0.0.1';
}

/**
 * Creates an in-memory rate limiter with explicit bounding and window expiry.
 * 
 * @param {Object} options
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default 1 minute)
 * @param {number} [options.maxRequests=25] - Maximum permitted requests per client in the window
 * @param {number} [options.maxEntries=1000] - Maximum unique active client records allowed in memory
 * @param {string} [options.name='default'] - Identifying label for logging/diagnostics
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 25,
  maxEntries = 1000,
  name = 'rate-limiter'
} = {}) {
  const map = new Map();

  /**
   * Remove records whose window has elapsed.
   * @param {number} now
   * @returns {number} Number of entries removed
   */
  function prune(now) {
    let removed = 0;
    for (const [key, record] of map.entries()) {
      if (now - record.startTime > windowMs) {
        map.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Check rate limit for the given client IP.
   * 
   * @param {string} ip
   * @returns {{ allowed: boolean, status: number, error?: string }}
   */
  function check(ip) {
    const now = Date.now();
    const clientKey = String(ip || 'unknown').trim();

    // Periodic opportunistic cleanup when map contains entries
    if (map.size > 100) {
      prune(now);
    }

    const record = map.get(clientKey);

    // Existing client record
    if (record) {
      if (now - record.startTime > windowMs) {
        // Window expired: start a new window
        record.count = 1;
        record.startTime = now;
        return { allowed: true, status: 200 };
      }

      if (record.count >= maxRequests) {
        return {
          allowed: false,
          status: 429,
          error: 'Too many requests. Please pause for a moment.'
        };
      }

      record.count += 1;
      return { allowed: true, status: 200 };
    }

    // New unseen client: check capacity constraint
    if (map.size >= maxEntries) {
      prune(now);

      // If still at strict capacity after pruning all expired records:
      if (map.size >= maxEntries) {
        // Explicit capacity rejection rather than evicting active records
        return {
          allowed: false,
          status: 503,
          error: 'Service temporarily at capacity. Please try again shortly.'
        };
      }
    }

    // Allocate new record
    map.set(clientKey, { count: 1, startTime: now });
    return { allowed: true, status: 200 };
  }

  /**
   * Reset all records (primarily for testing and lifecycle reset)
   */
  function reset() {
    map.clear();
  }

  /**
   * Get current internal map size (diagnostics / tests)
   */
  function size() {
    return map.size;
  }

  return {
    check,
    prune,
    reset,
    size,
    windowMs,
    maxRequests,
    maxEntries,
    name
  };
}
