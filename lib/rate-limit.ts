/**
 * Sliding-window rate limiter for the public, unauthenticated endpoints.
 *
 * In-process, like the event bus: one Next server owns all traffic in this
 * deployment, so a Map is enough and there's nothing else to run. If the app
 * is ever scaled out, this is the seam to swap for a shared store.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/** Drop stale keys so a long-running server doesn't grow without bound. */
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the caller may try again — only set when refused. */
  retryAfter?: number;
};

/**
 * Allows `limit` hits per `windowMs` for `key`. Keys should combine the
 * caller and the resource (e.g. `ip:slug`), so one abusive client can't
 * exhaust a tenant's allowance for everyone else.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  sweep(windowMs);

  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

/** Best-effort client address behind the usual proxies. */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}
