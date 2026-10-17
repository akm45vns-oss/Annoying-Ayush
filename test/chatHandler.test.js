import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleChatRequest } from '../api/chat-handler.js';

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

describe('Chat Handler & API Readiness', () => {
  it('responds to GET request with readiness and configuration status', async () => {
    const req = { method: 'GET', headers: {} };
    const res = new MockResponse();
    await handleChatRequest(req, res);
    assert.equal(res.statusCode, 200);

    const data = JSON.parse(res.body);
    assert.equal(data.ok, true);
    assert.ok('configured' in data);
    assert.ok('provider' in data);
  });

  it('rejects unsupported HTTP methods (e.g. PUT) with 405', async () => {
    const req = { method: 'PUT', headers: {} };
    const res = new MockResponse();
    await handleChatRequest(req, res);
    assert.equal(res.statusCode, 405);
  });

  it('rejects empty or whitespace chat messages with 400', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-real-ip': '10.0.0.99' },
      body: { message: '   ' }
    };
    const res = new MockResponse();
    await handleChatRequest(req, res);
    assert.equal(res.statusCode, 400);
  });

  it('provides zero-failure offline fallback when no API keys are configured', async () => {
    const origGroq = process.env.GROQ_API_KEY;
    const origGemini = process.env.GEMINI_API_KEY;
    const origOpenai = process.env.OPENAI_API_KEY;

    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const req = {
        method: 'POST',
        headers: { 'x-real-ip': '10.0.0.100' },
        body: { message: 'I miss you', gfName: 'Shristy', ayushName: 'Ayush' }
      };
      const res = new MockResponse();
      await handleChatRequest(req, res);
      assert.equal(res.statusCode, 200);

      const data = JSON.parse(res.body);
      assert.equal(data.ok, true);
      assert.equal(data.configured, false);
      assert.equal(data.isOfflineFallback, true);
      assert.ok(typeof data.reply === 'string' && data.reply.length > 0);
      assert.ok(typeof data.reaction === 'string');
    } finally {
      if (origGroq) process.env.GROQ_API_KEY = origGroq;
      if (origGemini) process.env.GEMINI_API_KEY = origGemini;
      if (origOpenai) process.env.OPENAI_API_KEY = origOpenai;
    }
  });
});
