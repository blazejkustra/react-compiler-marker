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

  private generateKey(content: string, filename: string): string {
    const hash = crypto.createHash("md5").update(content).digest("hex");
    return `${filename}:${hash}`;
  }

  get(content: string, filename: string): T | undefined {
    const key = this.generateKey(content, filename);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  set(content: string, filename: string, result: T): void {
    const key = this.generateKey(content, filename);

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
