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

    it('handles GET status probe with 200 and reports honest provider status', async () => {
      const origElevenKey = process.env.ELEVENLABS_API_KEY;
      const origElevenId = process.env.ELEVENLABS_VOICE_ID;
      const origOpenAi = process.env.OPENAI_API_KEY;

      try {
        // Test unconfigured
        delete process.env.ELEVENLABS_API_KEY;
        delete process.env.ELEVENLABS_VOICE_ID;
        delete process.env.OPENAI_API_KEY;

        const req1 = { method: 'GET', headers: {} };
        const res1 = new MockResponse();
        await handleTtsRequest(req1, res1);
        assert.equal(res1.statusCode, 200);
        const data1 = JSON.parse(res1.body);
        assert.equal(data1.ok, true);
        assert.equal(data1.status, 'ready');
        assert.equal(data1.configured, false);
        assert.equal(data1.hasElevenLabs, false);
        assert.equal(data1.voiceProvider, 'none');

        // Test with configured ElevenLabs
        process.env.ELEVENLABS_API_KEY = 'test_eleven_key';
        process.env.ELEVENLABS_VOICE_ID = 'test_voice_id_123';
        const req2 = { method: 'GET', headers: {} };
        const res2 = new MockResponse();
        await handleTtsRequest(req2, res2);
        const data2 = JSON.parse(res2.body);
        assert.equal(data2.configured, true);
        assert.equal(data2.hasElevenLabs, true);
        assert.equal(data2.voiceProvider, 'elevenlabs');
        assert.equal(data2.modelId, 'eleven_multilingual_v2');
      } finally {
        if (origElevenKey) process.env.ELEVENLABS_API_KEY = origElevenKey; else delete process.env.ELEVENLABS_API_KEY;
        if (origElevenId) process.env.ELEVENLABS_VOICE_ID = origElevenId; else delete process.env.ELEVENLABS_VOICE_ID;
        if (origOpenAi) process.env.OPENAI_API_KEY = origOpenAi; else delete process.env.OPENAI_API_KEY;
      }
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
      const origElevenKey = process.env.ELEVENLABS_API_KEY;
      const origElevenId = process.env.ELEVENLABS_VOICE_ID;
      const origOpenAi = process.env.OPENAI_API_KEY;
      delete process.env.ELEVENLABS_API_KEY;
      delete process.env.ELEVENLABS_VOICE_ID;
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
        if (origElevenKey) process.env.ELEVENLABS_API_KEY = origElevenKey;
        if (origElevenId) process.env.ELEVENLABS_VOICE_ID = origElevenId;
        if (origOpenAi) process.env.OPENAI_API_KEY = origOpenAi;
      }
    });

    it('generates binary MP3 audio using configured ElevenLabs custom voice and preserves Hindi Devanagari text', async () => {
      const origElevenKey = process.env.ELEVENLABS_API_KEY;
      const origElevenId = process.env.ELEVENLABS_VOICE_ID;
      const origFetch = globalThis.fetch;

      process.env.ELEVENLABS_API_KEY = 'test_key_abc';
      process.env.ELEVENLABS_VOICE_ID = 'custom_voice_xyz';

      let capturedUrl = '';
      let capturedHeaders = {};
      let capturedBody = null;

      const dummyMp3Bytes = Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);

      globalThis.fetch = async (url, options) => {
        capturedUrl = url;
        capturedHeaders = options.headers;
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => dummyMp3Bytes.buffer
        };
      };

      try {
        const req = {
          method: 'POST',
          headers: { 'x-real-ip': '10.0.0.3' },
          body: { text: 'नमस्ते जानू, तुम कैसी हो?' } // Hindi Devanagari phrase
        };
        const res = new MockResponse();
        await handleTtsRequest(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.headers['content-type'], 'audio/mpeg');
        assert.equal(Buffer.isBuffer(res.body), true);

        // Verify upstream request parameters
        assert.equal(capturedUrl, 'https://api.elevenlabs.io/v1/text-to-speech/custom_voice_xyz');
        assert.equal(capturedHeaders['xi-api-key'], 'test_key_abc');
        assert.equal(capturedHeaders['Accept'], 'audio/mpeg');
        assert.equal(capturedBody.text, 'नमस्ते जानू, तुम कैसी हो?', 'Devanagari text must be preserved without alteration');
        assert.equal(capturedBody.model_id, 'eleven_multilingual_v2');
      } finally {
        globalThis.fetch = origFetch;
        if (origElevenKey) process.env.ELEVENLABS_API_KEY = origElevenKey; else delete process.env.ELEVENLABS_API_KEY;
        if (origElevenId) process.env.ELEVENLABS_VOICE_ID = origElevenId; else delete process.env.ELEVENLABS_VOICE_ID;
      }
    });

    it('handles ElevenLabs API 401 or 404 gracefully with fallback JSON without throwing', async () => {
      const origElevenKey = process.env.ELEVENLABS_API_KEY;
      const origElevenId = process.env.ELEVENLABS_VOICE_ID;
      const origFetch = globalThis.fetch;

      process.env.ELEVENLABS_API_KEY = 'invalid_key';
      process.env.ELEVENLABS_VOICE_ID = 'bad_voice_id';

      globalThis.fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      try {
        const req = {
          method: 'POST',
          headers: { 'x-real-ip': '10.0.0.4' },
          body: { text: 'Testing fallback' }
        };
        const res = new MockResponse();
        await handleTtsRequest(req, res);

        assert.equal(res.statusCode, 200);
        const data = JSON.parse(res.body);
        assert.equal(data.ok, false);
        assert.equal(data.configured, true);
        assert.equal(data.providerError, true);
        assert.ok(data.error.includes('fallback'));
      } finally {
        globalThis.fetch = origFetch;
        if (origElevenKey) process.env.ELEVENLABS_API_KEY = origElevenKey; else delete process.env.ELEVENLABS_API_KEY;
        if (origElevenId) process.env.ELEVENLABS_VOICE_ID = origElevenId; else delete process.env.ELEVENLABS_VOICE_ID;
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
