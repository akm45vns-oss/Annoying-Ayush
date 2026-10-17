import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, getClientIp } from '../api/rateLimiter.js';

describe('Bounded Rate Limiter & IP Extraction', () => {
  describe('getClientIp', () => {
    it('prioritizes trusted x-real-ip header set by Vercel edge proxy', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 10.0.0.1'
        }
      };
      assert.equal(getClientIp(req), '203.0.113.195');
    });

    it('falls back to the leftmost IP in x-forwarded-for when x-real-ip is absent', () => {
      const req = {
        headers: {
          'x-forwarded-for': '198.51.100.42, 10.0.0.5, 172.16.0.1'
        }
      };
      assert.equal(getClientIp(req), '198.51.100.42');
    });

    it('falls back to socket remoteAddress when headers are missing', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '192.168.1.10' }
      };
      assert.equal(getClientIp(req), '192.168.1.10');
    });

    it('defaults safely to 127.0.0.1 on empty or missing request object', () => {
      assert.equal(getClientIp(null), '127.0.0.1');
      assert.equal(getClientIp({}), '127.0.0.1');
    });
  });

  describe('Rate Limiting & Capacity Policy', () => {
    let limiter;

    beforeEach(() => {
      limiter = createRateLimiter({
        windowMs: 1000, // 1 second window for fast tests
        maxRequests: 3,
        maxEntries: 4,
        name: 'test-limiter'
      });
    });

    it('allows requests within permitted limit', () => {
      const ip = '1.2.3.4';
      assert.equal(limiter.check(ip).allowed, true);
      assert.equal(limiter.check(ip).allowed, true);
      assert.equal(limiter.check(ip).allowed, true);
    });

    it('returns status 429 when client exceeds limit within window', () => {
      const ip = '1.2.3.4';
      limiter.check(ip);
      limiter.check(ip);
      limiter.check(ip);

      const fourth = limiter.check(ip);
      assert.equal(fourth.allowed, false);
      assert.equal(fourth.status, 429);
      assert.ok(fourth.error.includes('Too many requests'));
    });

    it('resets count after the window expires', async () => {
      const ip = '1.2.3.4';
      limiter.check(ip);
      limiter.check(ip);
      limiter.check(ip);
      assert.equal(limiter.check(ip).allowed, false);

      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 1050));

      const afterExpiry = limiter.check(ip);
      assert.equal(afterExpiry.allowed, true);
      assert.equal(afterExpiry.status, 200);
    });

    it('enforces strict capacity limit: rejects new clients with 503 when full without evicting active records', () => {
      // Fill the 4 slots with active clients
      limiter.check('client-1');
      limiter.check('client-2');
      limiter.check('client-3');
      limiter.check('client-4');

      assert.equal(limiter.size(), 4);

      // 5th client arrives while all 4 are active
      const overflowResult = limiter.check('client-5');
      assert.equal(overflowResult.allowed, false);
      assert.equal(overflowResult.status, 503);
      assert.ok(overflowResult.error.includes('capacity'));

      // Crucial: Client-1's limit was NOT evicted or reset!
      assert.equal(limiter.size(), 4);
    });

    it('frees capacity when expired entries are pruned', async () => {
      limiter.check('client-1');
      limiter.check('client-2');
      limiter.check('client-3');
      limiter.check('client-4');
      assert.equal(limiter.size(), 4);

      // Wait for window to pass
      await new Promise((r) => setTimeout(r, 1050));

      // New client should succeed because expired clients get pruned
      const newClient = limiter.check('client-5');
      assert.equal(newClient.allowed, true);
      assert.equal(newClient.status, 200);
    });
  });
});
