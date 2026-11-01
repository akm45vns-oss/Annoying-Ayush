/**
 * Chat Storage Manager
 * 100% private, client-side encrypted persistence for romantic conversation messages.
 * Never stores messages in raw plaintext on disk or in localStorage.
 */

import { safeGetEncryptedItem, safeSetEncryptedItem } from './secureStorage.js';

const CHAT_STORAGE_KEY = 'annoying_ayush_chat_messages_v1';
const MAX_PERSISTED_MESSAGES = 25;

export function loadChatHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = safeGetEncryptedItem(CHAT_STORAGE_KEY, true);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED_MESSAGES) : [];
  } catch (err) {
    console.warn('Could not read chat history:', err);
    return [];
  }
}

export function saveChatHistory(messages = []) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = messages.slice(-MAX_PERSISTED_MESSAGES);
    // Limit to 100KB for chat history
    safeSetEncryptedItem(CHAT_STORAGE_KEY, trimmed, 100 * 1024);
  } catch (err) {
    console.warn('Could not write chat history:', err);
  }
}

export function clearChatHistory() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not clear chat history from localStorage:', err);
  }
}
