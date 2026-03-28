// Shared in-memory cache for API routes
// Each domain (movies, people, etc.) should use a prefixed key to avoid collisions

const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

export const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

export function getMemoryCache() {
  return memoryCache;
}

/**
 * Invalidate all memory cache entries matching a prefix.
 * Returns the number of keys deleted.
 */
export function invalidateMemoryCacheByPrefix(prefix: string): number {
  let count = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}
