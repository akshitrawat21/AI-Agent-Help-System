import { getSession } from "@/lib/auth/session";
import { subscribe } from "@/lib/events";

/** Long-lived connection — never prerender or cache this. */
export const dynamic = "force-dynamic";

/**
 * Server-sent events, scoped to the caller's organization. Replaces the
 * Socket.IO custom server: one Next process owns all connections, so an
 * in-process emitter is enough and there's no separate server to run.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const orgId = session.org.id;
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
