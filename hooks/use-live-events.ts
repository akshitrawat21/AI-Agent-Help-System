"use client";

import { useEffect, useRef } from "react";
import type { AppEvent } from "@/lib/events";

/**
 * Subscribes to the org's SSE stream and calls back on every event.
 *
 * The handler is held in a ref so callers can pass an inline closure without
 * tearing down and re-opening the connection on every render.
 */
export function useLiveEvents(onEvent: (event: AppEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      source = new EventSource("/api/events");

      source.onmessage = (message) => {
        attempts = 0;
        try {
          const parsed = JSON.parse(message.data);
          if (parsed?.type && parsed.type !== "connected") {
            handler.current(parsed as AppEvent);
          }
        } catch {
          // Ignore malformed frames rather than killing the stream.
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (cancelled) return;

        // Back off so a server restart doesn't turn into a reconnect storm.
        attempts += 1;
        const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
        retry = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, []);
}
