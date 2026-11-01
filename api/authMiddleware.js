/**
 * API Authentication & Origin Verification Middleware
 * 
 * Protects serverless AI and voice-cloning endpoints from unauthorized quota consumption:
 * 1. Validates application authentication token (via x-app-token or Authorization: Bearer <secret>)
 *    when APP_SECRET / AYUSH_API_SECRET is configured.
 * 2. Validates origin / client signatures to disallow third-party web scrapers.
 */

export function verifyApiAccess(req) {
  // 1. If an explicit server secret is configured in environment, require and validate it
  const appSecret = (process.env.APP_SECRET || process.env.AYUSH_API_SECRET || '').trim();
  if (appSecret) {
    const authHeader = req.headers['authorization'] || '';
    const tokenHeader = req.headers['x-app-token'] || '';

    let providedToken = '';
    if (tokenHeader) {
      providedToken = String(tokenHeader).trim();
    } else if (authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.slice(7).trim();
    }

    if (!providedToken || providedToken !== appSecret) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Missing or invalid application token.'
      };
    }
    return { authorized: true };
  }

  // 2. Defense-in-depth: Origin & Client Header Verification
  const origin = (req.headers['origin'] || '').toLowerCase();
  const referer = (req.headers['referer'] || '').toLowerCase();
  const host = (req.headers['host'] || '').toLowerCase();
  const clientTag = req.headers['x-app-client'];

  // Native Capacitor or mobile apps don't have web browser origin, or send capacitor://localhost
  const isCapacitorOrLocal = !origin || 
    origin.startsWith('capacitor://') || 
    origin.startsWith('http://localhost') || 
    origin.startsWith('http://127.0.0.1') ||
    origin.includes('vercel.app');

  const matchesHost = host && (origin.includes(host) || referer.includes(host));

  // If a browser explicitly sends an unauthorized third-party origin, reject it
  if (origin && !isCapacitorOrLocal && !matchesHost && clientTag !== 'annoying-ayush') {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: Request origin is not permitted.'
    };
  }

  return { authorized: true };
}

