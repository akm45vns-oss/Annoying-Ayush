import { normalizeTranscript, isValidSpeechTranscript } from '../utils/normalizeTranscript.js';

/**
 * TranscriptionService
 * 
 * Handles sending complete audio phrase segments to the server speech-to-text API (/api/stt),
 * validating transcripts, handling timeouts, and aborting in-flight requests.
 */
export class TranscriptionService {
  constructor(options = {}) {
    this.options = {
      timeoutMs: 10000,
      endpoint: '/api/stt',
      ...options
    };

    this.currentAbortController = null;
    this.activeRequestId = 0;
  }

  /**
   * Cancel any in-flight transcription request
   */
  cancel() {
    this.activeRequestId++;
    if (this.currentAbortController) {
      try {
        this.currentAbortController.abort();
      } catch {}
      this.currentAbortController = null;
    }
  }

  /**
   * Transcribe an audio phrase Blob
   * 
   * @param {Blob} audioBlob - Complete captured phrase audio
   * @param {Object} context - Optional context { language, requestId }
   * @returns {Promise<{ ok: boolean, text: string, language?: string, error?: string, unconfigured?: boolean, cancelled?: boolean }>}
   */
  async transcribe(audioBlob, context = {}) {
    if (!audioBlob || audioBlob.size < 500) {
      return { ok: false, text: '', error: 'Audio segment too short' };
    }

    this.cancel();
    const reqId = ++this.activeRequestId;

    const controller = new AbortController();
    this.currentAbortController = controller;

    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new Error('Transcription timed out'));
      } catch {}
    }, this.options.timeoutMs);

    try {
      const headers = {
        'Content-Type': audioBlob.type || 'audio/webm',
        'x-app-client': 'annoying-ayush'
      };

      if (context.language) {
        headers['x-language'] = context.language;
      }

      const res = await fetch(this.options.endpoint, {
        method: 'POST',
        headers,
        body: audioBlob,
        signal: controller.signal
      });

      if (reqId !== this.activeRequestId) {
        return { ok: false, text: '', cancelled: true };
      }

      const data = await res.json().catch(() => null);

      if (reqId !== this.activeRequestId) {
        return { ok: false, text: '', cancelled: true };
      }

      if (!res.ok || !data) {
        return {
          ok: false,
          text: '',
          error: data?.error || `Server returned ${res.status}`
        };
      }

      if (data.configured === false) {
        return {
          ok: false,
          text: '',
          unconfigured: true,
          message: data.message
        };
      }

      if (data.ok && data.text) {
        const clean = normalizeTranscript(data.text);
        if (isValidSpeechTranscript(clean)) {
          return {
            ok: true,
            text: clean,
            language: data.language || 'auto',
            provider: data.provider || 'whisper'
          };
        }
        return { ok: false, text: '', error: 'Transcript did not meet speech validation criteria' };
      }

      return {
        ok: false,
        text: '',
        error: data.error || 'Empty transcription result'
      };
    } catch (err) {
      if (reqId !== this.activeRequestId || err.name === 'AbortError') {
        return { ok: false, text: '', cancelled: true };
      }
      return { ok: false, text: '', error: err.message || 'Transcription failed' };
    } finally {
      clearTimeout(timeoutId);
      if (this.currentAbortController === controller) {
        this.currentAbortController = null;
      }
    }
  }
}

