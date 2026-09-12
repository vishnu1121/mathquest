// Best-effort protection for the public demo: a small in-memory token bucket per client.
// Serverless instances each keep their own buckets; the Anthropic Console spend limit is the hard cap.

export const RATE_LIMIT = { capacity: 20, refillPerMinute: 20, maxClients: 5000 } as const;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export function takeToken(key: string, now: number, store: Map<string, Bucket> = buckets): boolean {
  const bucket = store.get(key) ?? { tokens: RATE_LIMIT.capacity, updatedAt: now };
  const refilled = Math.min(
    RATE_LIMIT.capacity,
    bucket.tokens + ((now - bucket.updatedAt) / 60_000) * RATE_LIMIT.refillPerMinute,
  );
  if (store.size >= RATE_LIMIT.maxClients && !store.has(key)) store.clear();
  if (refilled < 1) {
    store.set(key, { tokens: refilled, updatedAt: now });
    return false;
  }
  store.set(key, { tokens: refilled - 1, updatedAt: now });
  return true;
}
