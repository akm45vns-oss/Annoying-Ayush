let globalRequestCounter = 0;

/**
 * Generates an incrementally unique request ID for tracking async voice operations
 * and cleanly discarding stale responses after stops or state transitions.
 */
export function createRequestId(prefix = 'req') {
  globalRequestCounter = (globalRequestCounter + 1) % 1000000;
  return `${prefix}_${Date.now()}_${globalRequestCounter}`;
}

