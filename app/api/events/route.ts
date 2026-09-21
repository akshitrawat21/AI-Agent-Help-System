import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { eventsSince, subscribe } from "@/lib/events";

/** Long-lived or time-sensitive — never prerender or cache this. */
export const dynamic = "force-dynamic";

/**
 * Live events, scoped to the caller's organization, over either transport:
 *
 * - `GET /api/events?since=<ISO>` returns the events after that moment as
 *   JSON, plus the server's `now` to use as the next cursor. Works on
 *   serverless hosts, where this is what the dashboard uses.
 * - `GET /api/events` with no cursor opens a server-sent event stream fed by
 *   the in-process emitter — instant on a single long-running server.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const orgId = session.org.id;
  const since = request.nextUrl.searchParams.get("since");

  if (since !== null) {
    const now = new Date();
    const cursor = since ? new Date(since) : now;
    const events = Number.isNaN(cursor.getTime())
      ? []
      : await eventsSince(orgId, cursor);

    return NextResponse.json(
      { events, now: now.toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let unsubscribe: (() => void) | undefined;

      // One teardown path, so a failed write releases the interval and the
      // emitter listener too. Relying on the abort event alone leaked both
      // whenever a socket died without firing it.
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed by the client going away.
        }
      };

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const send = (data: unknown) => write(`data: ${JSON.stringify(data)}\n\n`);

      send({ type: "connected" });

      unsubscribe = subscribe((event) => {
        if (event.orgId === orgId) send(event);
      });

      // Comment frames keep proxies from closing an idle connection.
      heartbeat = setInterval(() => write(": ping\n\n"), 25000);

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell nginx-style proxies not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
