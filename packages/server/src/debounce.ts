const pending = new Map<string, { resolve: (value: null) => void; timer: NodeJS.Timeout }>();

export function debounce<T>(
  key: string,
  fn: () => T | null | Promise<T | null>,
  delayMs: number = 300
): Promise<T | null> {
  const existing = pending.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.resolve(null);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      pending.delete(key);
      try {
        const result = await fn();
        resolve(result);
      } catch {
        resolve(null);
      }
    }, delayMs);

    pending.set(key, { resolve, timer });
  });
}
