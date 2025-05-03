// electron/performance-optimizer.cjs
// A simplified CommonJS version of the performance-optimizer.ts file

class PerformanceOptimizer {
  static instance = null;

  static getInstance() {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  constructor() {
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.maxCacheSize = 100;
    console.log('PerformanceOptimizer initialized');
  }

  // Generate a cache key based on text and mode
  generateCacheKey(text, mode) {
    // Simple hash function for strings
    const hash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(16);
    };

    return `${hash(text)}_${mode}`;
  }

  // Check if a result is cached
  getCachedResult(text, mode) {
    const key = this.generateCacheKey(text, mode);
    if (this.cache.has(key)) {
      this.cacheHits++;
      console.log(`Cache hit for key ${key}. Total hits: ${this.cacheHits}`);
      return this.cache.get(key);
    }
    this.cacheMisses++;
    console.log(`Cache miss for key ${key}. Total misses: ${this.cacheMisses}`);
    return null;
  }

  // Store a result in the cache
  cacheResult(text, mode, result) {
    const key = this.generateCacheKey(text, mode);
    
    // Implement LRU cache if we exceed max size
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      console.log(`Cache full, removed oldest entry: ${oldestKey}`);
    }
    
    this.cache.set(key, result);
    console.log(`Cached result for key ${key}. Cache size: ${this.cache.size}`);
    return result;
  }

  // Clear the cache
  clearCache() {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('Cache cleared');
  }

  // Enhance text with caching
  async enhanceWithCache(text, mode, enhancementFunction) {
    // Check if we have a cached result
    const cachedResult = this.getCachedResult(text, mode);
    if (cachedResult) {
      return cachedResult;
    }
    
    // If not cached, call the enhancement function
    try {
      const result = await enhancementFunction(text, mode);
      return this.cacheResult(text, mode, result);
    } catch (error) {
      console.error('Error in enhanceWithCache:', error);
      throw error;
    }
  }
}

module.exports = PerformanceOptimizer;
