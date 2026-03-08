/**
 * FlowViz Cache System
 * Caches LLM-generated content per language, file, and feature
 * Invalidates on file content changes
 */

import crypto from "crypto";
import { LanguageCode } from "./languageManager";
import { FeatureType } from "./promptBuilder";

export interface CacheEntry {
  key: string;
  value: any;
  generatedAt: number;
  language: LanguageCode;
  feature: FeatureType;
  fileHash: string;
}

export interface CacheMetadata {
  projectId: string;
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * In-memory cache store (can be replaced with Redis/MongoDB for production)
 */
class FlowVizCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly maxAge: number;

  constructor(maxSizeMB = 50, maxAgeHours = 24) {
    this.cache = new Map();
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    this.maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to ms
  }

  /**
   * Generate cache key from file content, feature, and language
   */
  private generateKey(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType,
    languageCode: LanguageCode
  ): string {
    const fileHash = this.hashContent(fileContent);
    return `${projectId}:${filePath}:${fileHash}:${featureType}:${languageCode}`;
  }

  /**
   * Hash file content for cache key
   */
  private hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  /**
   * Get entry from cache
   */
  get(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType,
    languageCode: LanguageCode
  ): any | null {
    const key = this.generateKey(projectId, filePath, fileContent, featureType, languageCode);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    const age = Date.now() - entry.generatedAt;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set entry in cache
   */
  set(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType,
    languageCode: LanguageCode,
    value: any
  ): void {
    const key = this.generateKey(projectId, filePath, fileContent, featureType, languageCode);
    const fileHash = this.hashContent(fileContent);

    const entry: CacheEntry = {
      key,
      value,
      generatedAt: Date.now(),
      language: languageCode,
      feature: featureType,
      fileHash,
    };

    this.cache.set(key, entry);

    // Check if we need to evict old entries
    this.evictIfNeeded();
  }

  /**
   * Invalidate all cache entries for a specific file
   * Called when file content changes
   */
  invalidateFile(projectId: string, filePath: string): number {
    let deletedCount = 0;
    const prefix = `${projectId}:${filePath}:`;

    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Invalidate all cache entries for a project
   */
  invalidateProject(projectId: string): number {
    let deletedCount = 0;
    const prefix = `${projectId}:`;

    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Check if content exists in cache for a specific language
   */
  has(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType,
    languageCode: LanguageCode
  ): boolean {
    const key = this.generateKey(projectId, filePath, fileContent, featureType, languageCode);
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check expiry
    const age = Date.now() - entry.generatedAt;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(projectId?: string): CacheMetadata {
    let entries: CacheEntry[] = Array.from(this.cache.values());

    // Filter by project if specified
    if (projectId) {
      const prefix = `${projectId}:`;
      entries = entries.filter((e) => e.key.startsWith(prefix));
    }

    const totalSize = entries.reduce((sum, entry) => {
      return sum + JSON.stringify(entry.value).length;
    }, 0);

    const timestamps = entries.map((e) => e.generatedAt);

    return {
      projectId: projectId || "all",
      totalEntries: entries.length,
      totalSize,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Get all cached languages for a file+feature combination
   */
  getCachedLanguages(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType
  ): LanguageCode[] {
    const fileHash = this.hashContent(fileContent);
    const prefix = `${projectId}:${filePath}:${fileHash}:${featureType}:`;
    const languages: LanguageCode[] = [];

    for (const [key, entry] of this.cache) {
      if (key.startsWith(prefix)) {
        languages.push(entry.language);
      }
    }

    return languages;
  }

  /**
   * Evict old entries if cache size exceeds limit
   */
  private evictIfNeeded(): void {
    const stats = this.getStats();

    if (stats.totalSize > this.maxSize) {
      // Sort entries by age (oldest first)
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.generatedAt - b.generatedAt
      );

      // Delete oldest 20% of entries
      const toDelete = Math.ceil(entries.length * 0.2);
      for (let i = 0; i < toDelete && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size in MB
   */
  getSizeInMB(): number {
    const stats = this.getStats();
    return stats.totalSize / (1024 * 1024);
  }
}

/**
 * Global cache instance
 */
export const flowvizCache = new FlowVizCache();

/**
 * Cache manager with pre-warming capability
 */
export class CacheManager {
  /**
   * Pre-warm cache for a file in multiple languages
   * Generates content in background for commonly used languages
   */
  static async prewarmFile(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType,
    priorityLanguages: LanguageCode[],
    generateFn: (lang: LanguageCode) => Promise<any>
  ): Promise<void> {
    const promises = priorityLanguages.map(async (lang) => {
      // Check if already cached
      if (flowvizCache.has(projectId, filePath, fileContent, featureType, lang)) {
        return;
      }

      try {
        // Generate and cache
        const result = await generateFn(lang);
        flowvizCache.set(projectId, filePath, fileContent, featureType, lang, result);
      } catch (error) {
        console.error(`[Cache] Pre-warm failed for ${lang}:`, error);
      }
    });

    // Run in background, don't await
    Promise.all(promises).catch((err) =>
      console.error("[Cache] Pre-warm batch error:", err)
    );
  }

  /**
   * Get or generate content with caching
   */
  static async getOrGenerate<T>(
    projectId: string,
    filePath: string,
    fileContent: string,
    featureType: FeatureType,
    languageCode: LanguageCode,
    generateFn: () => Promise<T>
  ): Promise<{ data: T; cached: boolean }> {
    // Check cache first
    const cached = flowvizCache.get(
      projectId,
      filePath,
      fileContent,
      featureType,
      languageCode
    );

    if (cached !== null) {
      return { data: cached, cached: true };
    }

    // Generate new content
    const data = await generateFn();

    // Cache it
    flowvizCache.set(projectId, filePath, fileContent, featureType, languageCode, data);

    return { data, cached: false };
  }
}
