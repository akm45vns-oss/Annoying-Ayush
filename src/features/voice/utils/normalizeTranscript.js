/**
 * Normalizes speech transcript conservatively:
 * - Trims leading/trailing whitespace
 * - Collapses consecutive whitespace into single spaces
 * - Preserves user's exact words, names, slang, and multilingual script (Hindi/Devanagari, Hinglish, Bhojpuri, English)
 */
export function normalizeTranscript(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Validates whether a normalized transcript contains meaningful speech characters
 */
export function isValidSpeechTranscript(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = normalizeTranscript(text);
  if (clean.length < 2) return false;

  // Must contain letters or numbers in any script (including Devanagari \u0900-\u097F)
  const hasValidChars = /[a-zA-Z0-9\u0900-\u097F]/.test(clean) || (/\p{L}|\p{N}/u).test(clean);
  if (!hasValidChars) return false;

  // Rejects ambient breaths/filler utterances that speech recognizers emit on noise
  const normalizedLower = clean.toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '');
  const fillerUtterances = new Set([
    'uh', 'um', 'ah', 'eh', 'mm', 'hm', 'mhm', 'shh', 'tsk',
    'अह', 'उम', 'हम्म', 'हमम', 'आह'
  ]);

  return !fillerUtterances.has(normalizedLower);
}

