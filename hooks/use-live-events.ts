"use client";

import { useEffect, useRef } from "react";
import type { AppEvent } from "@/lib/events";

/** How often the polling transport asks for new events. */
const POLL_INTERVAL = 4000;

/**
 * Which transport to use. SSE is instant but needs one long-running server;
 * polling works anywhere. Vercel sets NEXT_PUBLIC_VERCEL_ENV on every
 * deployment, so serverless is detected without configuration — and
 * NEXT_PUBLIC_LIVE_TRANSPORT overrides either way.
 */
function preferPolling(): boolean {
  const forced = process.env.NEXT_PUBLIC_LIVE_TRANSPORT;
  if (forced === "poll") return true;
  if (forced === "sse") return false;
  return Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);
}

/**
 * Calls back on every live event for the caller's organization.
 *
 * The handler is held in a ref so callers can pass an inline closure without
 * tearing down and re-opening the connection on every render. If the stream
 * keeps failing — a host that can't hold connections open — it falls back to
 * polling on its own.
 */
export function useLiveEvents(onEvent: (event: AppEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let streamFailures = 0;
    let cursor = "";

    const deliver = (event: AppEvent) => {
      if (!cancelled) handler.current(event);
    };

    // ── Polling ────────────────────────────────────────────────────────
    const schedulePoll = (delay = POLL_INTERVAL) => {
      if (cancelled) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (cancelled) return;
      // A hidden tab doesn't need to know yet; catch up when it's visible.
      if (document.hidden) return schedulePoll();

      try {
        const response = await fetch(
          `/api/events?since=${encodeURIComponent(cursor)}`,
          { cache: "no-store" }
        );
        if (response.status === 401) return; // signed out — stop quietly
        if (!response.ok) throw new Error(String(response.status));

        const payload: { events: AppEvent[]; now: string } = await response.json();
        cursor = payload.now;
        for (const event of payload.events) deliver(event);
        schedulePoll();
      } catch {
        schedulePoll(POLL_INTERVAL * 3);
      }
    };

    const startPolling = () => {
      poll();
      document.addEventListener("visibilitychange", onVisible);
    };

    const onVisible = () => {
      if (!document.hidden) schedulePoll(0);
    };

    // ── Server-sent events ─────────────────────────────────────────────
    const connect = () => {
      if (cancelled) return;

      source = new EventSource("/api/events");

      source.onmessage = (message) => {
        streamFailures = 0;
        try {
          const parsed = JSON.parse(message.data);
          if (parsed?.type && parsed.type !== "connected") deliver(parsed as AppEvent);
        } catch {
          // Ignore malformed frames rather than killing the stream.
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (cancelled) return;

        // Three failures in a row means this host can't hold a stream open;
        // polling costs a little latency and works everywhere.
        streamFailures += 1;
        if (streamFailures >= 3) return startPolling();

        // Back off so a server restart doesn't turn into a reconnect storm.
        const delay = Math.min(30000, 1000 * 2 ** Math.min(streamFailures, 5));
        retry = setTimeout(connect, delay);
      };
    };

    if (preferPolling()) startPolling();
    else connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      if (pollTimer) clearTimeout(pollTimer);
      source?.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
