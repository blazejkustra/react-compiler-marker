type Pending<T> = {
  promise: Promise<T | null>;
  resolve: (value: T | null) => void;
  fn: () => T | null | Promise<T | null>;
  timer: NodeJS.Timeout;
};

const pending = new Map<string, Pending<unknown>>();

async function run(key: string): Promise<void> {
  const entry = pending.get(key);
  if (!entry) {
    return;
  }

  // Drop the entry before awaiting, so a call arriving during the computation
  // starts a fresh cycle instead of joining one that can no longer see it.
  pending.delete(key);
  try {
    entry.resolve(await entry.fn());
  } catch {
    entry.resolve(null);
  }
}

/**
 * Coalesce calls that share a key: the timer restarts on every call, and every
 * caller in the burst receives the single result that is finally computed.
 *
 * The burst must be shared rather than cancelled. A client that requests inlay
 * hints in chunks (Zed asks for ~50 rows at a time) fires several
 * near-simultaneous requests for one document; resolving all but the last with
 * `null` would leave most of the file unmarked.
 */
export function debounce<T>(
  key: string,
  fn: () => T | null | Promise<T | null>,
  delayMs: number = 300
): Promise<T | null> {
  const existing = pending.get(key) as Pending<T> | undefined;
  if (existing) {
    clearTimeout(existing.timer);
    // The newest call sees the newest document, so it wins the computation.
    existing.fn = fn;
    existing.timer = setTimeout(() => run(key), delayMs);
    return existing.promise;
  }

  let resolve!: (value: T | null) => void;
  const promise = new Promise<T | null>((res) => {
    resolve = res;
  });

  pending.set(key, {
    promise,
    resolve,
    fn,
    timer: setTimeout(() => run(key), delayMs),
  } as Pending<unknown>);

  return promise;
}
