/**
 * Advanced caching utilities for improved performance
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
    enablePersistence?: boolean;
    storageKey?: string;
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
declare class AdvancedCache<T> {
    private cache;
    private options;
    private stats;
    constructor(options?: CacheOptions);
    /**
     * Sets a value in the cache
     */
    set(key: string, data: T, customTtl?: number): void;
    /**
     * Gets a value from the cache
     */
    get(key: string): T | null;
    /**
     * Checks if a key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Deletes a specific key from the cache
     */
    delete(key: string): boolean;
    /**
     * Clears all cache entries
     */
    clear(): void;
    /**
     * Gets cache statistics
     */
    getStats(): CacheStats;
    /**
     * Gets all cache keys
     */
    keys(): string[];
    /**
     * Gets cache size
     */
    size(): number;
    /**
     * Removes expired entries
     */
    private cleanup;
    /**
     * Evicts least recently used entry
     */
    private evictLRU;
    /**
     * Saves cache to localStorage
     */
    private saveToStorage;
    /**
     * Loads cache from localStorage
     */
    private loadFromStorage;
    /**
     * Clears cache from localStorage
     */
    private clearStorage;
}
/**
 * Simple cache implementation for basic use cases
 */
declare class SimpleCache<T> {
    private cache;
    private ttl;
    constructor(ttlMinutes?: number);
    set(key: string, data: T): void;
    get(key: string): T | null;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
}
/**
 * Memoization decorator for functions
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, options?: {
    ttl?: number;
    maxSize?: number;
}): T;
/**
 * Async memoization for promises
 */
export declare function memoizeAsync<T extends (...args: any[]) => Promise<any>>(fn: T, options?: {
    ttl?: number;
    maxSize?: number;
}): T;
export declare const imageCache: SimpleCache<string>;
export declare const dataCache: AdvancedCache<any>;
export declare const apiCache: AdvancedCache<any>;
export { AdvancedCache, SimpleCache };
export declare const cacheManager: {
    /**
     * Clear all application caches
     */
    clearAll(): void;
    /**
     * Get combined cache statistics
     */
    getStats(): Record<string, CacheStats | {
        size: number;
    }>;
    /**
     * Get total memory usage estimate
     */
    getMemoryUsage(): {
        totalEntries: number;
        estimatedSizeKB: number;
    };
};
