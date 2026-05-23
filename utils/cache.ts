import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Shared cache for small app data.
 * Memory cache keeps active-session reads synchronous, AsyncStorage keeps cold
 * starts from rendering empty when fresh-enough data already exists.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>();
const STORAGE_PREFIX = "seismotrack_cache:";

/**
 * Check if cached data is still valid
 */
function isCacheValid(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  const isExpired = Date.now() - entry.timestamp > entry.ttl;
  if (isExpired) {
    cache.delete(key);
    return false;
  }
  return true;
}

/**
 * Get cached data
 */
export function getCachedData<T>(key: string): T | null {
  if (!isCacheValid(key)) return null;
  return cache.get(key)?.data ?? null;
}

/**
 * Set cache data
 */
export function setCacheData<T>(key: string, data: T, ttlMs: number = 60_000): void {
  const entry = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  cache.set(key, entry);
  AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry)).catch(() => {});
}

/**
 * Hydrate a value from AsyncStorage and mirror it into memory if it is still
 * valid. Use this on startup/cold screens where synchronous memory cache may
 * still be empty.
 */
export async function getPersistentCache<T>(key: string): Promise<T | null> {
  const memoryValue = getCachedData<T>(key);
  if (memoryValue !== null) return memoryValue;

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || Date.now() - entry.timestamp > entry.ttl) {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }

    cache.set(key, entry);
    return entry.data;
  } catch {
    return null;
  }
}

export function setPersistentCache<T>(key: string, data: T, ttlMs: number = 60_000): void {
  setCacheData(key, data, ttlMs);
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
  AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`).catch(() => {});
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
  AsyncStorage.getAllKeys()
    .then((keys) => AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(STORAGE_PREFIX))))
    .catch(() => {});
}

// Cache keys
export const CACHE_KEYS = {
  DIRASAKAN: 'earthquake_dirasakan_latest',
  TERDETEKSI: 'earthquake_terdeteksi_latest',
  DIRASAKAN_HISTORY: 'earthquake_dirasakan_history',
  TERDETEKSI_HISTORY: 'earthquake_terdeteksi_history',
  USER_LOCATION: 'user_location',
  USER_PROFILE: 'user_profile',
} as const;
