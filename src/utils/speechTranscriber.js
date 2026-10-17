/**
 * Speech Recognition / Transcriber Utility
 * 
 * Uses browser Web Speech API (native on Android Chrome, Safari, Edge)
 * to transcribe her spoken words into text before voice cloning generation.
 */

export class SpeechTranscriber {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
    this.init();
  }

  isSupported() {
    return typeof window !== 'undefined' && !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  init() {
    if (!this.isSupported()) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US'; // Supports natural English / Hinglish speech

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (this.onResultCallback) {
          this.onResultCallback(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
    }
  }

  start(onResult, onError, onEnd) {
    if (!this.isSupported()) {
      throw new Error('Speech recognition is not supported in this browser. You can type your message directly below!');
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch {
      // If already started, restart
      try {
        this.recognition.stop();
        setTimeout(() => {
          this.recognition.start();
          this.isListening = true;
        }, 100);
      } catch (err) {
        throw new Error(err.message || 'Could not start microphone listening.');
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }
}

export const speechTranscriber = new SpeechTranscriber();
