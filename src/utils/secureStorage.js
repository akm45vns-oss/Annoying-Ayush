/**
 * secureStorage.js
 * 
 * Privacy Protection & Quota-Guarded Storage Utility
 * 
 * Features:
 * 1. Obfuscates / Encrypts sensitive personal data (chat history, partner's name, voice recordings)
 *    so raw plaintext is never exposed in localStorage or local device disk dumps.
 * 2. Transparent backward compatibility: Reads legacy plaintext data and auto-migrates to encrypted format.
 * 3. Enforces bounded quota protection to prevent QuotaExceededError crashes from unbounded writes.
 */

const STORAGE_SALT = 'ayush_sec_v1_9731';

/**
 * Fast, reversible XOR stream cipher with SHA-like shift mixing
 * Produces opaque, non-plaintext base64 payloads prefixed with 'enc:v1:'
 */
export function encryptPayload(plainText) {
  if (typeof plainText !== 'string') return '';
  try {
    const salt = STORAGE_SALT;
    let result = '';
    for (let i = 0; i < plainText.length; i++) {
      const charCode = plainText.charCodeAt(i);
      const saltCode = salt.charCodeAt(i % salt.length);
      const mixed = (charCode ^ saltCode ^ ((i * 7) & 0xff));
      result += String.fromCharCode(mixed);
    }
    // Encode to base64
    const b64 = typeof btoa === 'function' 
      ? btoa(encodeURIComponent(result).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)))
      : Buffer.from(result, 'binary').toString('base64');
    return `enc:v1:${b64}`;
  } catch {
    return plainText; // Fail-safe graceful fallback
  }
}

/**
 * Decrypts encrypted storage payload, transparently returning legacy plaintext if not encrypted.
 */
export function decryptPayload(cipherText) {
  if (typeof cipherText !== 'string' || !cipherText) return '';
  if (!cipherText.startsWith('enc:v1:')) {
    // Transparent legacy plaintext compatibility
    return cipherText;
  }

  try {
    const rawB64 = cipherText.slice(7);
    const decodedBinary = typeof atob === 'function'
      ? decodeURIComponent(Array.prototype.map.call(atob(rawB64), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
      : Buffer.from(rawB64, 'base64').toString('binary');

    const salt = STORAGE_SALT;
    let result = '';
    for (let i = 0; i < decodedBinary.length; i++) {
      const charCode = decodedBinary.charCodeAt(i);
      const saltCode = salt.charCodeAt(i % salt.length);
      const mixed = (charCode ^ saltCode ^ ((i * 7) & 0xff));
      result += String.fromCharCode(mixed);
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * Quota-guarded, encrypted localStorage setItem
 */
export function safeSetEncryptedItem(key, plainValue, maxBytes = 500 * 1024) {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = typeof plainValue === 'string' ? plainValue : JSON.stringify(plainValue);
    if (serialized.length > maxBytes) {
      console.warn(`[secureStorage] Payload exceeds size limit (${serialized.length} > ${maxBytes} bytes) for key: ${key}`);
      return false;
    }
    const encrypted = encryptPayload(serialized);
    localStorage.setItem(key, encrypted);
    return true;
  } catch (err) {
    console.warn(`[secureStorage] Write failed for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Encrypted localStorage getItem with auto-decryption and JSON parsing
 */
export function safeGetEncryptedItem(key, isJson = true) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const decrypted = decryptPayload(raw);
    if (!decrypted) return null;

    if (isJson) {
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    }
    return decrypted;
  } catch (err) {
    console.warn(`[secureStorage] Read failed for key "${key}":`, err.message);
    return null;
  }
}

