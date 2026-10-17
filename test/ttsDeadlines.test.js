import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleTtsRequest, SERVER_TOTAL_DEADLINE_MS } from '../api/tts-handler.js';
import { clonedVoiceEngine } from '../src/utils/clonedVoiceEngine.js';

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }
  setHeader(key, val) {
    this.headers[key.toLowerCase()] = val;
  }
  end(content) {
    this.body = content;
  }
}

describe('TTS Deadlines & Request Coordination', () => {
  beforeEach(() => {
    clonedVoiceEngine.cleanup();
  });

  describe('Server TTS Handler', () => {
    it('defines a server deadline bounded within Vercel execution limits (14s)', () => {
      assert.equal(SERVER_TOTAL_DEADLINE_MS, 14000);
      assert.ok(SERVER_TOTAL_DEADLINE_MS < 15000, 'Server deadline must be strictly less than 15s function maxDuration');
    });

    it('handles GET status probe with 200', async () => {
      const req = { method: 'GET', headers: {} };
      const res = new MockResponse();
      await handleTtsRequest(req, res);
      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.ok, true);
      assert.equal(data.status, 'ready');
    });

    it('rejects unsupported methods (e.g. DELETE) with 405', async () => {
      const req = { method: 'DELETE', headers: {} };
      const res = new MockResponse();
      await handleTtsRequest(req, res);
      assert.equal(res.statusCode, 405);
    });

    it('rejects empty or whitespace text prompts with 400', async () => {
      const req = {
        method: 'POST',
        headers: { 'x-real-ip': '10.0.0.1' },
        body: { text: '   ' }
      };
      const res = new MockResponse();
      await handleTtsRequest(req, res);
      assert.equal(res.statusCode, 400);
    });

    it('returns graceful fallback response when keys are unconfigured on server', async () => {
      const origEleven = process.env.ELEVENLABS_API_KEY;
      const origOpenAi = process.env.OPENAI_API_KEY;
      delete process.env.ELEVENLABS_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const req = {
          method: 'POST',
          headers: { 'x-real-ip': '10.0.0.2' },
          body: { text: 'Hello Ayush!' }
        };
        const res = new MockResponse();
        await handleTtsRequest(req, res);
        assert.equal(res.statusCode, 200);

        const data = JSON.parse(res.body);
        assert.equal(data.ok, false);
        assert.equal(data.configured, false);
        assert.ok(data.message.includes('fallback'));
      } finally {
        if (origEleven) process.env.ELEVENLABS_API_KEY = origEleven;
        if (origOpenAi) process.env.OPENAI_API_KEY = origOpenAi;
      }
    });
  });

  describe('Client Voice Engine Cancellation & Late Responses', () => {
    it('cancels in-flight generation when cancelGeneration or stopPlayback is called', async () => {
      // Mock global fetch with a delayed response
      const originalFetch = globalThis.fetch;
      let fetchAborted = false;

      globalThis.fetch = (url, options) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              ok: true,
              headers: { get: () => 'audio/mpeg' },
              arrayBuffer: async () => new ArrayBuffer(1024)
            });
          }, 500);

          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              fetchAborted = true;
              clearTimeout(timeout);
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      };

      try {
        // Start TTS generation
        const promise = clonedVoiceEngine.generateSpeech('Cute message');

        // Immediately stop/cancel
        clonedVoiceEngine.stopPlayback();

        const result = await promise;
        assert.equal(result.cancelled, true, 'Result must be marked cancelled');
        assert.equal(fetchAborted, true, 'Upstream fetch must have received abort signal');
        assert.equal(clonedVoiceEngine.hasAudio(), false, 'Cancelled audio must not be stored in cache');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('rejects late-arriving responses after reset without playing or caching', async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              headers: { get: () => 'audio/mpeg' },
              arrayBuffer: async () => new ArrayBuffer(512)
            });
          }, 100);
        });
      };

      try {
        const generationPromise = clonedVoiceEngine.generateSpeech('Delayed speech');
        // User triggers Reset / Stop before response returns
        clonedVoiceEngine.cleanup();

        const result = await generationPromise;
        assert.equal(result.cancelled, true);
        assert.equal(clonedVoiceEngine.hasAudio(), false);
        assert.equal(clonedVoiceEngine.isPlaying, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
