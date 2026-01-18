/**
 * Advanced caching utilities for improved performance
 */

// Logger will be added when available

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  enablePersistence?: boolean; // Store in localStorage
  storageKey?: string; // Key for localStorage
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalAccesses: number;
}

/**
 * Advanced in-memory cache with TTL, LRU eviction, and optional persistence
 */
class AdvancedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      enablePersistence: false,
      storageKey: 'app_cache',
      ...options
    };

    if (this.options.enablePersistence) {
      this.loadFromStorage();
    }

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Sets a value in the cache
   */
  set(key: string, data: T, customTtl?: number): void {
    const ttl = customTtl || this.options.ttl;
    const now = Date.now();

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);

    if (this.options.enablePersistence) {
      this.saveToStorage();
    }

    console.debug('Cache entry set', { key, ttl, cacheSize: this.cache.size });
  }

  /**
   * Gets a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      console.debug('Cache miss', { key });
      return null;
    }

    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      console.debug('Cache entry expired', { key, age: now - entry.timestamp });
      
      if (this.options.enablePersistence) {
        this.saveToStorage();
      }
      
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    console.debug('Cache hit', { key, accessCount: entry.accessCount });
    return entry.data;
  }

  /**
   * Checks if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Deletes a specific key from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted && this.options.enablePersistence) {
      this.saveToStorage();
    }
    
    console.debug('Cache entry deleted', { key, deleted });
    return deleted;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    
    if (this.options.enablePersistence) {
      this.clearStorage();
    }
    
    console.info('Cache cleared');
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    const totalAccesses = this.stats.hits + this.stats.misses;
    const hitRate = totalAccesses > 0 ? (this.stats.hits / totalAccesses) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalAccesses
    };
  }

  /**
   * Gets all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Gets cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Removes expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.debug('Cache cleanup completed', { removedCount, remainingSize: this.cache.size });
      
      if (this.options.enablePersistence) {
        this.saveToStorage();
      }
    }
  }

  /**
   * Evicts least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.debug('LRU eviction', { evictedKey: oldestKey });
    }
  }

  /**
   * Saves cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const serializable = Array.from(this.cache.entries());
      localStorage.setItem(this.options.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save cache to storage', error);
    }
  }

  /**
   * Loads cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const entries: [string, CacheEntry<T>][] = JSON.parse(stored);
        const now = Date.now();
        let loadedCount = 0;

        for (const [key, entry] of entries) {
          // Only load non-expired entries
          if (now - entry.timestamp <= entry.ttl) {
            this.cache.set(key, entry);
            loadedCount++;
          }
        }

        console.info('Cache loaded from storage', { loadedCount, totalStored: entries.length });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage', error);
    }
  }

  /**
   * Clears cache from localStorage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.options.storageKey);
    } catch (error) {
      console.warn('Failed to clear cache storage', error);
    }
  }
}

/**
 * Simple cache implementation for basic use cases
 */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Memoization decorator for functions
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: { ttl?: number; maxSize?: number } = {}
): T {
  const cache = new AdvancedCache<ReturnType<T>>({
    ttl: options.ttl || 5 * 60 * 1000, // 5 minutes
    maxSize: options.maxSize || 50
  });

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached !== null) {
      return cached as Awaited<ReturnType<T>>;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Async memoization for promises
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: { ttl?: number; maxSize?: number } = {}
): T {
  const cache = new AdvancedCache<ReturnType<T>>({
    ttl: options.ttl || 5 * 60 * 1000,
    maxSize: options.maxSize || 50
  });

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached !== null) {
      return cached as Awaited<ReturnType<T>>;
    }

    const result = await fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Pre-configured cache instances
export const imageCache = new SimpleCache<string>(30); // 30 minutes for image URLs
export const dataCache = new AdvancedCache<unknown>({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  enablePersistence: true,
  storageKey: 'app_data_cache'
});
export const apiCache = new AdvancedCache<unknown>({
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 200,
  enablePersistence: false
});

// Export classes for custom implementations
export { AdvancedCache, SimpleCache };

// Cache management utilities
export const cacheManager = {
  /**
   * Clear all application caches
   */
  clearAll(): void {
    imageCache.clear();
    dataCache.clear();
    apiCache.clear();
    console.info('All caches cleared');
  },

  /**
   * Get combined cache statistics
   */
  getStats(): Record<string, CacheStats | { size: number }> {
    return {
      image: { size: imageCache.size() },
      data: dataCache.getStats(),
      api: apiCache.getStats()
    };
  },

  /**
   * Get total memory usage estimate
   */
  getMemoryUsage(): { totalEntries: number; estimatedSizeKB: number } {
    const totalEntries = imageCache.size() + dataCache.size() + apiCache.size();
    // Rough estimate: 1KB per entry on average
    const estimatedSizeKB = totalEntries * 1;
    
    return { totalEntries, estimatedSizeKB };
  }
};
