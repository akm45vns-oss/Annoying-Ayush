/**
 * LocalStorage Settings & Relationship Unlocks Manager
 * 100% private & client-side persistence
 */

const SETTINGS_KEY = 'annoying_ayush_romantic_settings_v1';
const UNLOCKS_KEY = 'annoying_ayush_unlocks_v1';

export const DEFAULT_SETTINGS = {
  gfName: 'Babe',
  ayushName: 'Ayush',
  anniversaryDate: '', // Format: YYYY-MM-DD
  soundEnabled: true,
  romanticMessagesEnabled: true,
  floatingEffectsEnabled: true,
  customModelUrl: '', // Optional override for custom .glb file
};

export const DEFAULT_UNLOCKS = {
  secretHeartUnlocked: false,
  comboUnlocked: false,
  heartTapCount: 0,
  totalKisses: 0,
  totalHugs: 0,
};

export function loadRomanticSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveRomanticSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    // Blob URLs are session-only and become dead after page reload — never persist them.
    const toSave = {
      ...settings,
      customModelUrl:
        settings.customModelUrl && settings.customModelUrl.startsWith('blob:')
          ? ''
          : (settings.customModelUrl || '')
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Could not save settings to localStorage:', e);
  }
}

export function loadUnlocks() {
  if (typeof window === 'undefined') return DEFAULT_UNLOCKS;
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    if (!raw) return DEFAULT_UNLOCKS;
    return { ...DEFAULT_UNLOCKS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_UNLOCKS;
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
