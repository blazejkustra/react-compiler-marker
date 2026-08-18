import * as crypto from "crypto";

interface CacheEntry<T> {
  result: T;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * `scope` identifies the compiler that produced the result — the workspace
   * root and plugin path it was loaded from. Without it the same absolute file
   * analyzed against two different roots (nested roots, or a report scanning an
   * outer root while inlay hints resolve the inner one) would share an entry,
   * silently serving one root's plugin output to the other.
   */
  private generateKey(content: string, filename: string, mode: string, scope: string): string {
    const hash = crypto.createHash("md5").update(content).digest("hex");
    return `${scope}:${filename}:${mode}:${hash}`;
  }

  get(content: string, filename: string, mode: string, scope: string): T | undefined {
    const key = this.generateKey(content, filename, mode, scope);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  set(content: string, filename: string, mode: string, scope: string, result: T): void {
    const key = this.generateKey(content, filename, mode, scope);

    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { result });
  }

  clear(): void {
    this.cache.clear();
  }
}
