// electron/performance-optimizer.ts
import { debounce } from 'lodash';
// @ts-ignore - Type definitions are available but TypeScript is not finding them
import md5 from 'crypto-js/md5';

interface CacheEntry {
  text: string;
  mode: string;
  timestamp: number;
  result: string;
}

class EnhancementCache {
  private cache: Map<string, CacheEntry>;
  private maxCacheSize: number = 1000;
  private cacheTimeout: number = 3600000; // 1 hour

  constructor() {
    this.cache = new Map();
  }

  generateKey(text: string, mode: string): string {
    return md5(`${text}|${mode}`).toString();
  }

  get(text: string, mode: string): string | null {
    const key = this.generateKey(text, mode);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(text: string, mode: string, result: string): void {
    // Clear old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.clearOldestEntries();
    }

    const key = this.generateKey(text, mode);
    this.cache.set(key, {
      text,
      mode,
      timestamp: Date.now(),
      result
    });
  }

  clearOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20% of entries
    const removeCount = Math.floor(this.maxCacheSize * 0.2);
    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private enhancementCache: EnhancementCache;
  private requestQueue: Map<string, Promise<string>>;

  private constructor() {
    this.enhancementCache = new EnhancementCache();
    this.requestQueue = new Map();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  async enhanceWithCache(
    text: string,
    mode: string,
    enhanceFunction: (text: string, mode: string) => Promise<string>
  ): Promise<string> {
    // Check cache first
    const cached = this.enhancementCache.get(text, mode);
    if (cached) {
      console.log('Cache hit for enhancement');
      return cached;
    }

    // Check if there's already a pending request for this text
    const requestKey = this.enhancementCache.generateKey(text, mode);
    if (this.requestQueue.has(requestKey)) {
      console.log('Using existing request');
      return this.requestQueue.get(requestKey)!;
    }

    // Create new request
    const requestPromise = enhanceFunction(text, mode)
      .then(result => {
        this.enhancementCache.set(text, mode, result);
        this.requestQueue.delete(requestKey);
        return result;
      })
      .catch(error => {
        this.requestQueue.delete(requestKey);
        throw error;
      });

    this.requestQueue.set(requestKey, requestPromise);
    return requestPromise;
  }

  // Debounced enhancement function to prevent rapid API calls
  debouncedEnhance = debounce(
    async (
      text: string,
      mode: string,
      enhanceFunction: (text: string, mode: string) => Promise<string>
    ): Promise<string> => {
      return this.enhanceWithCache(text, mode, enhanceFunction);
    },
    300, // 300ms debounce
    { leading: true, trailing: false }
  );

  // Batch enhancement for multiple texts at once
  async batchEnhance(
    texts: string[],
    mode: string,
    enhanceFunction: (text: string, mode: string) => Promise<string>
  ): Promise<string[]> {
    const results: string[] = [];

    // Process in parallel but limit concurrency
    const concurrencyLimit = 5;

    for (let i = 0; i < texts.length; i += concurrencyLimit) {
      const batch = texts.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(text => this.enhanceWithCache(text, mode, enhanceFunction))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // Prefetch common patterns
  async prefetchCommon(): Promise<void> {
    const commonGreetings = [
      "Hi, I'm",
      "Hello, this is",
      "Hey there, I'm",
      "Good morning",
      "Good afternoon",
      "Good evening"
    ];

    // Don't await this - let it run in background
    commonGreetings.forEach(greeting => {
      ['agent', 'general', 'answer'].forEach(mode => {
        // Simulate enhancement for common patterns
        this.enhancementCache.set(greeting, mode, `${greeting} (prefetched)`);
      });
    });
  }

  // Clear cache if needed
  clearCache(): void {
    this.enhancementCache.clear();
  }
}

export default PerformanceOptimizer;
