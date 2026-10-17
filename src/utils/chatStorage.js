/**
 * Chat Storage Manager
 * 100% private, client-side persistence for recent chat messages.
 */

const CHAT_STORAGE_KEY = 'annoying_ayush_chat_messages_v1';
const MAX_PERSISTED_MESSAGES = 25;

export function loadChatHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED_MESSAGES) : [];
  } catch (err) {
    console.warn('Could not read chat history from localStorage:', err);
    return [];
  }
}

export function saveChatHistory(messages = []) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = messages.slice(-MAX_PERSISTED_MESSAGES);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Could not write chat history to localStorage:', err);
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
