/**
 * LocalStorage Settings & Relationship Unlocks Manager
 * 100% private & client-side persistence
 */

const SETTINGS_KEY = 'annoying_ayush_romantic_settings_v1';
const UNLOCKS_KEY = 'annoying_ayush_unlocks_v1';

export const DEFAULT_SETTINGS = {
  gfName: 'Shristy',
  ayushName: 'Ayush',
  anniversaryDate: '2025-07-21',
  soundEnabled: true,
  romanticMessagesEnabled: true,
  floatingEffectsEnabled: true,
  customModelUrl: '',
  voiceMode: 'device',
  recognitionLanguage: 'auto',
};

export const DEFAULT_UNLOCKS = {
  secretHeartUnlocked: false,
  comboUnlocked: false,
  heartTapCount: 0,
  totalKisses: 0,
  totalHugs: 0,
};

/**
 * Validates and normalizes a 3D model URL for persistent storage or loading.
 * Ephemeral 'blob:' URLs are session-only and never considered durable persistent URLs.
 * Valid durable URLs include:
 * - relative paths (e.g. '/models/ayush.glb', './model.glb')
 * - absolute http:// or https:// URLs with safe schemes
 * 
 * @param {any} url - URL or path to validate
 * @returns {string} Safe normalized URL string, or empty string '' if invalid or temporary blob.
 */
export function validateAndNormalizeModelUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Blob URLs are ephemeral and become dead on page reload.
  // Never treat them as durable persistent model references.
  if (trimmed.toLowerCase().startsWith('blob:')) {
    return '';
  }

  // Reject unsafe schemes (e.g., javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }

  // Accept valid relative URLs starting with / or ./ or ../
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }

  // Validate absolute URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // Malformed URL format
  }

  return '';
}

/**
 * Safely loads romantic settings from localStorage with validation and sanitization.
 * Stale blob URLs from older sessions are cleaned both in-memory and updated in localStorage.
 * 
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadRomanticSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }

    // Sanitize customModelUrl: cleans existing stored blob: URLs from previous sessions
    const sanitizedModelUrl = validateAndNormalizeModelUrl(parsed.customModelUrl);

    // If localStorage contained an invalid/stale blob URL, rewrite localStorage cleanly
    if (parsed.customModelUrl && parsed.customModelUrl !== sanitizedModelUrl) {
      try {
        const cleaned = { ...parsed, customModelUrl: sanitizedModelUrl };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleaned));
      } catch {}
    }

    return {
      gfName: typeof parsed.gfName === 'string' && parsed.gfName.trim() ? parsed.gfName.trim() : DEFAULT_SETTINGS.gfName,
      ayushName: typeof parsed.ayushName === 'string' && parsed.ayushName.trim() ? parsed.ayushName.trim() : DEFAULT_SETTINGS.ayushName,
      anniversaryDate: typeof parsed.anniversaryDate === 'string' && parsed.anniversaryDate.trim() ? parsed.anniversaryDate.trim() : DEFAULT_SETTINGS.anniversaryDate,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      romanticMessagesEnabled: typeof parsed.romanticMessagesEnabled === 'boolean' ? parsed.romanticMessagesEnabled : DEFAULT_SETTINGS.romanticMessagesEnabled,
      floatingEffectsEnabled: typeof parsed.floatingEffectsEnabled === 'boolean' ? parsed.floatingEffectsEnabled : DEFAULT_SETTINGS.floatingEffectsEnabled,
      customModelUrl: sanitizedModelUrl,
      voiceMode: ['funny', 'device', 'cloned'].includes(parsed.voiceMode) ? parsed.voiceMode : DEFAULT_SETTINGS.voiceMode,
      recognitionLanguage: ['auto', 'hi-IN', 'en-IN', 'hinglish', 'bho-IN'].includes(parsed.recognitionLanguage) ? parsed.recognitionLanguage : DEFAULT_SETTINGS.recognitionLanguage,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves romantic settings to localStorage, sanitizing model URLs before saving.
 * 
 * @param {Object} settings
 */
export function saveRomanticSettings(settings) {
  if (typeof window === 'undefined' || !settings || typeof settings !== 'object') return;
  try {
    const sanitizedModelUrl = validateAndNormalizeModelUrl(settings.customModelUrl);
    const toSave = {
      ...settings,
      customModelUrl: sanitizedModelUrl
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Could not save settings to localStorage:', e);
  }
}

export function loadUnlocks() {
  if (typeof window === 'undefined') return { ...DEFAULT_UNLOCKS };
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    if (!raw) return { ...DEFAULT_UNLOCKS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_UNLOCKS };
    return { ...DEFAULT_UNLOCKS, ...parsed };
  } catch {
    return { ...DEFAULT_UNLOCKS };
  }
}

export function saveUnlocks(unlocks) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(unlocks));
  } catch (e) {
    console.warn('Could not save unlocks to localStorage:', e);
  }
}

export function resetAllSettingsAndUnlocks() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(UNLOCKS_KEY);
  } catch (e) {
    console.warn('Could not reset localStorage:', e);
  }
}

/**
 * Calculate days together from anniversary date
 */
export function calculateDaysTogether(anniversaryDate) {
  if (!anniversaryDate) return null;
  try {
    // Parse as LOCAL date to avoid UTC midnight off-by-one in non-UTC timezones.
    // anniversaryDate is expected in 'YYYY-MM-DD' format from an <input type="date">.
    const parts = anniversaryDate.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;

    const start = new Date(year, month - 1, day); // local midnight
    const now = new Date();
    // Compare calendar dates (ignore time of day for accurate day count)
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowDateOnly.getTime() - startDateOnly.getTime();
    if (diffTime < 0) return null;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
