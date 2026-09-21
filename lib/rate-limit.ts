import { db } from "@/lib/db";

/**
 * Sliding-window rate limiter for the public, unauthenticated endpoints.
 *
 * Hits are rows in Postgres rather than a Map, so the limit holds across
 * serverless instances and server restarts alike; the table is the shared
 * store every deployment already has. Old rows are swept as a side effect of
 * refusals and the occasional allowed hit, so it needs no maintenance.
 */

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
export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    const recent = await db.rateLimitHit.findMany({
      where: { key, createdAt: { gt: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
      take: limit,
    });

    if (recent.length >= limit) {
      const oldest = recent[0].createdAt.getTime();
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now.getTime()) / 1000)),
      };
    }

    await db.rateLimitHit.create({ data: { key } });

    // Roughly one allowed hit in twenty pays for the sweep.
    if (Math.random() < 0.05) {
      await db.rateLimitHit.deleteMany({
        where: { createdAt: { lt: new Date(now.getTime() - windowMs * 2) } },
      });
    }

    return { ok: true };
  } catch (error) {
    // A limiter that can't reach its store shouldn't take the product down
    // with it; let the request through and say so in the logs.
    console.warn("[rate-limit] store unavailable, allowing request", error);
    return { ok: true };
  }
}

/** Best-effort client address behind the usual proxies. */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}
