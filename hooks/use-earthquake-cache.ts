/**
 * Simple in-memory cache for earthquake data
 * Prevents duplicate API calls across screens
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>();

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
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
}

// Cache keys
export const CACHE_KEYS = {
  DIRASAKAN: 'earthquake_dirasakan_latest',
  TERDETEKSI: 'earthquake_terdeteksi_latest',
  DIRASAKAN_HISTORY: 'earthquake_dirasakan_history',
  TERDETEKSI_HISTORY: 'earthquake_terdeteksi_history',
  USER_LOCATION: 'user_location',
} as const;
