import { EventEmitter } from "node:events";

/**
 * In-process pub/sub backing the SSE endpoint. A single Next server owns all
 * connections in this MVP, so an emitter is enough — no Redis, no separate
 * websocket server. Swap the transport here if the app is ever scaled out.
 */
export type AppEvent =
  | { type: "escalation.created"; orgId: string; escalationId: string }
  | { type: "escalation.answered"; orgId: string; escalationId: string }
  | { type: "escalation.missed"; orgId: string; escalationId: string }
  | { type: "message.created"; orgId: string; conversationId: string }
  | { type: "conversation.updated"; orgId: string; conversationId: string };

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

export function publish(event: AppEvent) {
  emitter.emit("event", event);
}

export function subscribe(listener: (event: AppEvent) => void) {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}
