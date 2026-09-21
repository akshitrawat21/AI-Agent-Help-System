import { EventEmitter } from "node:events";
import { db } from "@/lib/db";

/**
 * Live events for the dashboard.
 *
 * Two transports share one `publish`:
 *
 * - An in-process emitter feeds the SSE stream in `app/api/events` — instant
 *   when one long-running server owns every connection (local dev, Render, a
 *   VPS).
 * - A small `LiveEvent` table feeds polling — the only thing that works when
 *   each request may land on a different serverless instance (Vercel), where
 *   an emitter in one function never reaches a stream held by another.
 *
 * Rows are only needed for a few minutes; `publish` sweeps old ones now and
 * then so the table never needs maintenance.
 */
export type AppEvent =
  | { type: "escalation.created"; orgId: string; escalationId: string }
  | { type: "escalation.answered"; orgId: string; escalationId: string }
  | { type: "escalation.missed"; orgId: string; escalationId: string }
  | { type: "message.created"; orgId: string; conversationId: string }
  | { type: "conversation.updated"; orgId: string; conversationId: string };

/** How long a row stays queryable. Pollers ask every few seconds. */
const RETENTION_MS = 15 * 60 * 1000;

const globalForEvents = globalThis as unknown as {
  appEvents: EventEmitter | undefined;
};

const emitter =
  globalForEvents.appEvents ??
  (() => {
    const e = new EventEmitter();
    // Many browser tabs can subscribe at once; the default cap of 10 is low.
    e.setMaxListeners(0);
    return e;
  })();

globalForEvents.appEvents = emitter;

export async function publish(event: AppEvent): Promise<void> {
  emitter.emit("event", event);

  try {
    await db.liveEvent.create({
      data: {
        orgId: event.orgId,
        type: event.type,
        escalationId: "escalationId" in event ? event.escalationId : null,
        conversationId: "conversationId" in event ? event.conversationId : null,
      },
    });

    // Roughly one publish in twenty pays for the sweep; nobody waits on it.
    if (Math.random() < 0.05) {
      await db.liveEvent.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
      });
    }
  } catch (error) {
    // The stream already has the event; losing a poll row degrades to the
    // next full refresh rather than failing the request that caused it.
    console.warn("[events] could not persist live event", error);
  }
}

export function subscribe(listener: (event: AppEvent) => void) {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

/** Events for one org since a moment in time, oldest first — the poll feed. */
export async function eventsSince(orgId: string, since: Date): Promise<AppEvent[]> {
  const rows = await db.liveEvent.findMany({
    where: { orgId, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return rows.map((row) => {
    if (row.escalationId) {
      return {
        type: row.type,
        orgId: row.orgId,
        escalationId: row.escalationId,
      } as AppEvent;
    }
    return {
      type: row.type,
      orgId: row.orgId,
      conversationId: row.conversationId ?? "",
    } as AppEvent;
  });
}
