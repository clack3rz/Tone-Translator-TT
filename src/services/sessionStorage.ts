import { ToneResult, SignalChainElement } from '../types';
import { PresetData } from './presetParser';

export const CURRENT_SESSION_SCHEMA_VERSION = 1;
export const SESSION_STORAGE_KEY = 'tt_working_session_v1';

export interface WorkingSessionData {
  schemaVersion: number;
  revision: number;
  savedAt: string;
  prompt: string;
  youtubeUrl?: string;
  useValidationRecipes: boolean;
  activeVariation: 'primary' | 'v1' | 'v2';
  exportFilename?: string;
  toneResult: ToneResult | null;
  userPreset?: PresetData | null;
  diffs?: string[];
  activeGearId?: string | null;
  isChainViewOpen?: boolean;
}

export type WorkingSessionPayload = Omit<WorkingSessionData, 'schemaVersion' | 'savedAt'>;

let currentRevision = 0;
let pendingSaveTimer: any = null;
let pendingPayload: WorkingSessionPayload | null = null;

/**
 * Validates whether an unknown object matches the expected WorkingSessionData schema.
 */
export function validateSessionSchema(data: any): { isValid: boolean; reason?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, reason: 'Not an object' };
  }

  if (typeof data.schemaVersion !== 'number') {
    return { isValid: false, reason: 'Missing or invalid schemaVersion' };
  }

  if (data.schemaVersion !== CURRENT_SESSION_SCHEMA_VERSION) {
    return { 
      isValid: false, 
      reason: `Unsupported schemaVersion: ${data.schemaVersion} (expected ${CURRENT_SESSION_SCHEMA_VERSION})` 
    };
  }

  if (typeof data.prompt !== 'string') {
    return { isValid: false, reason: 'Invalid prompt property' };
  }

  // Validate toneResult if present
  if (data.toneResult !== null && data.toneResult !== undefined) {
    if (typeof data.toneResult !== 'object') {
      return { isValid: false, reason: 'Invalid toneResult property' };
    }

    if (!Array.isArray(data.toneResult.signal_chain)) {
      return { isValid: false, reason: 'toneResult.signal_chain must be an array' };
    }

    for (let i = 0; i < data.toneResult.signal_chain.length; i++) {
      const item = data.toneResult.signal_chain[i];
      if (!item || typeof item !== 'object') {
        return { isValid: false, reason: `Invalid signal_chain element at index ${i}` };
      }
      if (typeof item.name !== 'string' || typeof item.type !== 'string') {
        return { isValid: false, reason: `signal_chain item at index ${i} missing name or type` };
      }
      if (item.settings && typeof item.settings !== 'object') {
        return { isValid: false, reason: `signal_chain item at index ${i} settings must be an object` };
      }
    }
  }

  return { isValid: true };
}

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const memoryFallback = new MemoryStorage();

export function getSessionStorageBackend(): { 
  getItem: (k: string) => string | null; 
  setItem: (k: string, v: string) => void; 
  removeItem: (k: string) => void; 
} {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__tt_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {
    // fallback to memory
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage;
    }
  } catch (e) {
    // fallback to memory
  }
  return memoryFallback;
}

/**
 * Writes payload immediately to storage.
 */
function executeSave(payload: WorkingSessionPayload): boolean {
  try {
    currentRevision++;
    const fullSession: WorkingSessionData = {
      ...payload,
      schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
      revision: currentRevision,
      savedAt: new Date().toISOString()
    };

    const serialized = JSON.stringify(fullSession);
    const storage = getSessionStorageBackend();
    storage.setItem(SESSION_STORAGE_KEY, serialized);

    const chainCount = payload.toneResult?.signal_chain?.length ?? 0;
    console.log(
      `[TT Session] Saved working session (revision=${currentRevision}, chainItems=${chainCount}, bytes=${serialized.length})`
    );
    return true;
  } catch (err) {
    console.warn('[TT Session] Failed to save working session to localStorage:', err);
    return false;
  }
}

/**
 * Debounced save of working session.
 */
export function saveWorkingSession(payload: WorkingSessionPayload, immediate: boolean = false): void {
  pendingPayload = payload;

  if (immediate) {
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer);
      pendingSaveTimer = null;
    }
    executeSave(payload);
    pendingPayload = null;
    return;
  }

  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer);
  }

  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = null;
    if (pendingPayload) {
      executeSave(pendingPayload);
      pendingPayload = null;
    }
  }, 300);
}

/**
 * Flushes any pending debounced session save immediately.
 */
export function flushWorkingSession(): void {
  if (pendingSaveTimer && pendingPayload) {
    clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
    executeSave(pendingPayload);
    pendingPayload = null;
  }
}

/**
 * Loads and validates existing working session from localStorage.
 */
export function loadWorkingSession(): { session: WorkingSessionData | null; restored: boolean; reason?: string } {
  try {
    const storage = getSessionStorageBackend();
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      console.log('[TT Session] No recoverable session found');
      return { session: null, restored: false, reason: 'empty' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn('[TT Session] Corrupt JSON in stored session, discarding:', parseErr);
      storage.removeItem(SESSION_STORAGE_KEY);
      return { session: null, restored: false, reason: 'corrupt_json' };
    }

    const validation = validateSessionSchema(parsed);
    if (!validation.isValid) {
      console.warn(`[TT Session] Stored session validation failed (${validation.reason}), discarding.`);
      storage.removeItem(SESSION_STORAGE_KEY);
      return { session: null, restored: false, reason: validation.reason };
    }

    currentRevision = typeof parsed.revision === 'number' ? parsed.revision : 0;
    const chainItems = parsed.toneResult?.signal_chain?.length ?? 0;
    console.log(
      `[TT Session] Restored working session (revision=${currentRevision}, chainItems=${chainItems})`
    );

    return {
      session: parsed as WorkingSessionData,
      restored: true
    };
  } catch (err) {
    console.warn('[TT Session] Exception while restoring working session:', err);
    return { session: null, restored: false, reason: 'exception' };
  }
}

/**
 * Deliberately clears the stored working session.
 */
export function clearWorkingSession(): void {
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
  }
  pendingPayload = null;
  try {
    const storage = getSessionStorageBackend();
    storage.removeItem(SESSION_STORAGE_KEY);
    console.log('[TT Session] Cleared working session from storage');
  } catch (err) {
    console.warn('[TT Session] Failed to clear localStorage session:', err);
  }
}

/**
 * Initializes concise lifecycle diagnostics and auto-flush handlers.
 */
export function initSessionLifecycleDiagnostics(): () => void {
  console.log('[TT Lifecycle] App mounted');

  const handleVisibilityChange = () => {
    console.log(`[TT Lifecycle] visibilitychange (state=${document.visibilityState})`);
    if (document.visibilityState === 'hidden') {
      flushWorkingSession();
    }
  };

  const handlePageHide = (e: PageTransitionEvent) => {
    console.log(`[TT Lifecycle] pagehide (persisted=${e.persisted})`);
    flushWorkingSession();
  };

  const handlePageShow = (e: PageTransitionEvent) => {
    console.log(`[TT Lifecycle] pageshow (persisted=${e.persisted})`);
  };

  const handleBeforeUnload = () => {
    console.log('[TT Lifecycle] beforeunload');
    flushWorkingSession();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    flushWorkingSession();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    console.log('[TT Lifecycle] App unmounted');
  };
}
