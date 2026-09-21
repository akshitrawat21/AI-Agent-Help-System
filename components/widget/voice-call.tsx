"use client";

import { Mic, PhoneOff, UserRound, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

/**
 * The hands-free surface: one big control, a plain-language status, and the
 * last exchange. Everything else stays out of the way, because during a call
 * the visitor is listening rather than reading.
 */
export function VoiceCall({
  state,
  transcript,
  lastQuestion,
  lastAnswer,
  agentName,
  handoff,
  error,
  onStart,
  onStop,
}: {
  state: VoiceState;
  /** What the visitor is saying right now, as it's recognised. */
  transcript: string;
  lastQuestion: string | null;
  lastAnswer: string | null;
  agentName: string;
  /** Set while a teammate owns the conversation. */
  handoff: null | "waiting" | "live";
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const active = state !== "idle";

  // Once a teammate is on the line, the labels should name them rather than
  // the assistant — the visitor is talking to a person now.
  const status = {
    idle: "Tap to start talking",
    listening: transcript
      ? "Listening…"
      : handoff === "live"
        ? "Go ahead — your teammate is listening"
        : "Go ahead, I'm listening",
    thinking: handoff ? "Connecting you…" : "Thinking…",
    speaking: handoff === "live" ? "Your teammate is speaking" : `${agentName} is speaking`,
  }[state];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6 py-8">
      {/* Orb */}
      <div className="relative flex size-40 items-center justify-center">
        {/* Rings pulse only while the mic is actually open, so the animation
            means something rather than decorating. */}
        {state === "listening" && (
          <>
            <span className="absolute size-40 animate-ping rounded-full bg-primary/15 [animation-duration:2s]" />
            <span className="absolute size-32 animate-ping rounded-full bg-primary/20 [animation-duration:1.6s]" />
          </>
        )}
        {state === "speaking" && (
          <span className="absolute size-36 animate-pulse rounded-full bg-emerald-500/15" />
        )}

        <button
          type="button"
          onClick={active ? onStop : onStart}
          aria-label={active ? "End voice chat" : "Start voice chat"}
          className={cn(
            "relative flex size-28 items-center justify-center rounded-full transition-all duration-300 active:scale-95",
            // Idle: the lit azure of every primary action. In a call: ink —
            // the same inverse material as the closing call to action.
            active
              ? "ink text-background"
              : "glossy bg-primary text-primary-foreground hover:scale-[1.03]"
          )}
        >
          {state === "thinking" ? (
            <span className="flex gap-1.5">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="size-2 animate-bounce rounded-full bg-current"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
              ))}
            </span>
          ) : state === "speaking" ? (
            <Volume2 className="size-9" />
          ) : active ? (
            <PhoneOff className="size-8" />
          ) : (
            <Mic className="size-9" />
          )}
        </button>
      </div>

      {/* Status */}
      <div className="flex min-h-16 max-w-md flex-col items-center gap-2 text-center">
        <p
          className={cn(
            "text-[14px] font-medium transition-colors",
            state === "listening" && "text-primary",
            state === "speaking" && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {status}
        </p>

        {transcript && state === "listening" && (
          <p className="text-[15px] leading-relaxed">“{transcript}”</p>
        )}

        {error && <p className="text-[13px] text-destructive">{error}</p>}
      </div>

      {/* Last exchange, so there's something to read if the audio was missed */}
      {(lastQuestion || lastAnswer) && (
        <div className="glass-pill w-full max-w-md space-y-3 rounded-2xl p-4">
          {lastQuestion && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                You said
              </p>
              <p className="text-[13.5px] leading-relaxed">{lastQuestion}</p>
            </div>
          )}
          {lastAnswer && (
            <div className="space-y-1 border-t border-white/50 pt-3 dark:border-white/10">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {handoff === "live" ? "Your teammate" : agentName}
              </p>
              <p className="text-[13.5px] leading-relaxed">{lastAnswer}</p>
            </div>
          )}
        </div>
      )}

      {handoff && (
        <p className="glass-pill flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground">
          <UserRound className="size-3.5" />
          {handoff === "live"
            ? "You're on with a teammate — keep talking, you'll hear them reply."
            : "Connecting you to a teammate — stay on the line."}
        </p>
      )}
    </div>
  );
}
