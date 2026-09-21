"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Loader2,
  MessageSquare,
  Mic,
  Square,
  UserRound,
} from "lucide-react";
import { VoiceCall, type VoiceState } from "@/components/widget/voice-call";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { clockTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: string;
  content: string;
  confidence?: number | null;
  /** Absent on the synthetic opening greeting, which has no real send time. */
  createdAt?: string | null;
};

/** Poll while a human is expected, so their reply appears without a refresh. */
const POLL_INTERVAL = 4000;

export function AssistantChat({
  slug,
  agentName,
  greeting,
  voiceEnabled,
  suggestions,
  visitor,
  collectVisitorDetails,
  teamOnline,
}: {
  slug: string;
  agentName: string;
  greeting: string;
  voiceEnabled: boolean;
  suggestions: string[];
  /** Identity the host site passed in, if any. Either field may be empty. */
  visitor: { name: string; email: string };
  /** Ask for a name and email before the first message, unless already known. */
  collectVisitorDetails: boolean;
  /** Whether any of the tenant's staff have a dashboard open right now. */
  teamOnline: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "greeting", role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  /** Issued by the server; proves this browser owns the conversation. */
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  /** Set while a teammate owns the conversation: "waiting" then "live". */
  const [handoff, setHandoff] = useState<null | "waiting" | "live">(null);
  /** Recommendations offered when the assistant wasn't sure. */
  const [offered, setOffered] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Ids already shown, so polling only speaks genuinely new replies. */
  const seenMessageIds = useRef(new Set<string>());

  /** Who's asking — from the host site, or the pre-chat form. */
  const [identity, setIdentity] = useState(visitor);
  const [detailsForm, setDetailsForm] = useState({ name: "", email: "" });

  /**
   * Resume a conversation this browser already has with this tenant. A
   * refresh — or coming back tomorrow — shouldn't lose the thread, and a
   * visitor mid-hand-off must land back in it. Keyed per tenant so one
   * browser can talk to several sites without crossing wires.
   */
  const storageKey = `helpdesk:${slug}`;
  useEffect(() => {
    let saved: { conversationId: string; visitorToken: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    } catch {
      saved = null;
    }
    if (!saved?.conversationId || !saved.visitorToken) return;
    const { conversationId: savedId, visitorToken: savedToken } = saved;

    const params = new URLSearchParams({
      conversationId: savedId,
      visitorToken: savedToken,
    });

    fetch(`/api/widget/${slug}/chat?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.conversation) {
          localStorage.removeItem(storageKey);
          return;
        }
        const fetched: Message[] = payload.conversation.messages;
        for (const message of fetched) seenMessageIds.current.add(message.id);
        setConversationId(savedId);
        setVisitorToken(savedToken);
        setMessages((current) => [current[0], ...fetched]);

        const status: string = payload.conversation.status;
        if (status === "waiting") setHandoff("waiting");
        else if (status === "live") setHandoff("live");
      })
      .catch(() => {});
  }, [slug, storageKey]);

  // The pre-chat form gates the first message only when nobody has told us
  // who this is, and there's no existing thread to pick up.
  const needsDetails =
    collectVisitorDetails &&
    !identity.name &&
    !identity.email &&
    !conversationId;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Text already in the box when the mic was tapped. */
  const dictationPrefix = useRef("");
  /** Whether the message being sent came from speech. */
  const spokenRef = useRef(false);

  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");

  // The recognition callbacks outlive any one render, so they read the mode
  // and the turn handler from refs instead of closing over stale values.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  /** True between starting a voice call and hanging up. */
  const callActive = useRef(false);
  const onUtterance = useRef<(text: string) => void>(() => {});

  const synthesis = useSpeechSynthesis();

  const speech = useSpeechRecognition({
    // Voice calls hold the mic open across pauses; dictation lets it close
    // when the speaker stops.
    continuous: mode === "voice",
    onInterim: (text) => {
      if (modeRef.current === "voice") setTranscript(text);
      // Append rather than replace: someone can type "Order 4182 — " and then
      // dictate the rest.
      else setInput(`${dictationPrefix.current}${text}`);
    },
    onFinal: (text) => {
      if (modeRef.current === "voice") onUtterance.current(text);
      else setInput(`${dictationPrefix.current}${text}`);
    },
  });

  // Pull the stable callbacks out of the hook results. The hooks return a new
  // object every render, so depending on `speech`/`synthesis` themselves would
  // make every useCallback below change identity on each render — which in
  // turn fires effect cleanups continuously.
  const { start: startListening, stop: stopListening } = speech;
  const { speak, cancel: cancelSpeech } = synthesis;

  const startDictation = () => {
    const existing = input.trim();
    dictationPrefix.current = existing ? `${existing} ` : "";
    spokenRef.current = true;
    startListening();
  };

  // Pin to the newest message on every change.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      if (speech.listening) stopListening();

      setError(null);
      setInput("");
      setSending(true);

      // Show the visitor's own message straight away.
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          role: "visitor",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const response = await fetch(`/api/widget/${slug}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationId: conversationId ?? undefined,
            visitorToken: visitorToken ?? undefined,
            channel: spokenRef.current ? "voice" : "widget",
            visitorName: identity.name || undefined,
            visitorEmail: identity.email || undefined,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.errors?.message ?? payload.error ?? "Something went wrong",
          );
        }

        const payload = await response.json();
        setConversationId(payload.conversationId);
        setVisitorToken(payload.visitorToken ?? null);
        setOffered(payload.suggestions ?? []);

        if (payload.conversationId && payload.visitorToken) {
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                conversationId: payload.conversationId,
                visitorToken: payload.visitorToken,
              })
            );
          } catch {
            // Storage blocked: the thread just won't survive a refresh.
          }
        }

        // While a teammate owns the conversation the server returns no
        // assistant reply — the message just goes to them.
        if (payload.message) {
          seenMessageIds.current.add(payload.message.id);
          setMessages((current) => [...current, payload.message]);
        }

        if (payload.awaitingHuman) {
          setHandoff((current) => current ?? "waiting");
        }

        return {
          content: (payload.message?.content as string | undefined) ?? null,
          escalated: Boolean(payload.escalated),
        };
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Couldn't reach the assistant",
        );
        return null;
      } finally {
        spokenRef.current = false;
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [
      conversationId,
      visitorToken,
      sending,
      slug,
      speech.listening,
      stopListening,
      identity,
      storageKey,
    ],
  );

  /**
   * One turn of the hands-free loop.
   *
   * The microphone is closed for the whole answer — otherwise recognition
   * picks up the assistant's own voice through the speakers and the call
   * talks to itself. Each `callActive` check bails out if the visitor hung up
   * while a request or an utterance was still in flight.
   */
  const handleUtterance = useCallback(
    async (text: string) => {
      if (!callActive.current) return;

      stopListening();
      setTranscript("");
      setVoiceState("thinking");

      const reply = await send(text);
      if (!callActive.current) return;

      if (reply?.content) {
        setVoiceState("speaking");
        await speak(reply.content);
        if (!callActive.current) return;
      }

      // Reopen the mic so the visitor can keep talking — to the assistant, or
      // to the teammate once one has joined. Polling speaks their replies.
      setVoiceState("listening");
      startListening();
    },
    [send, startListening, stopListening, speak],
  );

  onUtterance.current = handleUtterance;

  const startCall = useCallback(() => {
    callActive.current = true;
    // Everything said in a call is logged against the voice channel.
    spokenRef.current = true;
    setError(null);
    setTranscript("");
    setVoiceState("listening");
    startListening();
  }, [startListening]);

  const endCall = useCallback(() => {
    callActive.current = false;
    stopListening();
    cancelSpeech();
    setTranscript("");
    setVoiceState("idle");
  }, [stopListening, cancelSpeech]);

  // Leaving voice mode hangs up.
  useEffect(() => {
    if (mode !== "voice") endCall();
  }, [mode, endCall]);

  // Never leave the mic open or a sentence playing after unmount. Held in a
  // ref so this runs on teardown only, never on a re-render.
  const endCallRef = useRef(endCall);
  endCallRef.current = endCall;
  useEffect(() => () => endCallRef.current(), []);

  /**
   * While a teammate owns the conversation, poll for their side of it.
   *
   * This runs for the whole hand-off, not just until the first reply: the
   * visitor asked for a person, so they get a real back-and-forth rather than
   * one answer and a dead page. In voice mode each new human message is read
   * aloud, which is what makes a voice hand-off a live call rather than a
   * silent transcript.
   */
  useEffect(() => {
    if (!handoff || !conversationId || !visitorToken) return;

    let cancelled = false;

    const timer = setInterval(async () => {
      const params = new URLSearchParams({ conversationId, visitorToken });
      const response = await fetch(`/api/widget/${slug}/chat?${params}`);
      if (!response.ok || cancelled) return;

      const payload = await response.json();
      const fetched: Message[] = payload.conversation.messages;

      // Keep the local greeting at the top; the server owns everything else.
      setMessages((current) => [current[0], ...fetched]);

      const fresh = fetched.filter(
        (message) =>
          message.role === "human" && !seenMessageIds.current.has(message.id)
      );
      for (const message of fetched) seenMessageIds.current.add(message.id);

      if (fresh.length > 0) {
        setHandoff("live");
        // Read the teammate's words out loud so a voice hand-off stays a
        // conversation the visitor can hear.
        if (modeRef.current === "voice" && callActive.current) {
          stopListening();
          setVoiceState("speaking");
          for (const message of fresh) await speak(message.content);
          if (callActive.current) {
            setVoiceState("listening");
            startListening();
          }
        }
      }

      // The teammate closing it ends the hand-off.
      const status = payload.conversation.status;
      if (status === "resolved" || status === "missed") {
        setHandoff(null);
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    handoff,
    conversationId,
    visitorToken,
    slug,
    speak,
    startListening,
    stopListening,
  ]);

  const showSuggestions = messages.length === 1 && !sending && !handoff;

  // Voice needs both halves: recognition to hear, synthesis to answer.
  const voiceAvailable =
    voiceEnabled && speech.supported && synthesis.supported;

  const lastOf = (role: string) =>
    [...messages].reverse().find((message) => message.role === role) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {voiceAvailable && (
        <div className="flex shrink-0 justify-center border-b border-white/40 py-2.5 dark:border-white/8">
          <div className="glass-pill inline-flex items-center gap-0.5 rounded-lg p-0.5">
            {(
              [
                { value: "chat", label: "Chat", icon: MessageSquare },
                { value: "voice", label: "Voice", icon: Mic },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  "flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                  mode === value
                    ? "bg-surface text-foreground shadow-[0_1px_3px_oklch(0_0_0/0.08)] dark:bg-white/12"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsDetails ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setIdentity({
              name: detailsForm.name.trim(),
              email: detailsForm.email.trim(),
            });
          }}
          className="animate-rise flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-8"
        >
          <div className="max-w-sm text-center">
            <p className="text-[16px] font-semibold tracking-[-0.01em]">
              Before we start
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Tell us who you are so the team can follow up if they need to.
            </p>
          </div>
          <div className="glass-pill w-full max-w-sm space-y-3 rounded-2xl p-4">
            <div className="space-y-1.5">
              <label htmlFor="pre-name" className="text-[12.5px] font-medium">
                Name
              </label>
              <input
                id="pre-name"
                required
                autoFocus
                value={detailsForm.name}
                onChange={(event) =>
                  setDetailsForm({ ...detailsForm, name: event.target.value })
                }
                className="glass-pill h-10 w-full rounded-xl px-3 text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/16"
                placeholder="Alex Morgan"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pre-email" className="text-[12.5px] font-medium">
                Email
              </label>
              <input
                id="pre-email"
                type="email"
                required
                value={detailsForm.email}
                onChange={(event) =>
                  setDetailsForm({ ...detailsForm, email: event.target.value })
                }
                className="glass-pill h-10 w-full rounded-xl px-3 text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/16"
                placeholder="alex@example.com"
              />
            </div>
            <button
              type="submit"
              className="glossy h-10 w-full rounded-xl bg-primary text-[14px] font-medium text-primary-foreground transition-transform active:scale-[0.99]"
            >
              Start
            </button>
          </div>
        </form>
      ) : mode === "voice" ? (
        <VoiceCall
          state={voiceState}
          transcript={transcript}
          lastQuestion={lastOf("visitor")?.content ?? null}
          lastAnswer={
            messages.length > 1 ? (lastOf("assistant")?.content ?? null) : null
          }
          agentName={agentName}
          handoff={handoff}
          error={error ?? speech.error}
          onStart={startCall}
          onStop={endCall}
        />
      ) : (
        <>
          {/* Transcript */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {/* An empty conversation centres its greeting rather than pinning it
            to the top of a tall, blank column. */}
            <div
              className={cn(
                "mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 sm:px-6",
                showSuggestions && "min-h-full justify-center",
              )}
            >
              {messages.map((message) => (
                <Bubble
                  key={message.id}
                  message={message}
                  agentName={agentName}
                />
              ))}

              {sending && (
                <div className="animate-pop flex gap-2.5">
                  <Dot />
                  <div className="glass-pill rounded-2xl rounded-tl-md px-3.5 py-2.5">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50"
                          style={{ animationDelay: `${index * 120}ms` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {/* Offered when the assistant wasn't sure — a wording mismatch is
                  the commonest reason it misses, and one click fixes it
                  without costing a teammate anything. */}
              {offered.length > 0 && !sending && !handoff && (
                <div className="space-y-2 pl-9">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Did you mean
                  </p>
                  <div className="stagger flex flex-wrap gap-2">
                    {offered.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="glass-pill rounded-full px-3 py-1.5 text-[12.5px] text-foreground/80 transition-[color,background-color] duration-150 hover:bg-surface hover:text-foreground dark:hover:bg-white/12"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {handoff && !sending && (
                <div className="animate-slide-down glass-pill flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground">
                  <UserRound className="size-3.5" />
                  {handoff === "live"
                    ? "You're talking with a teammate — keep replying here."
                    : teamOnline
                      ? "A teammate is joining — this page updates on its own."
                      : "Your message has reached the team. Nobody's online right now, so a reply may take a little longer — keep this page open."}
                </div>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Try asking
                  </p>
                  <div className="stagger flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="glass-pill rounded-full px-3 py-1.5 text-[12.5px] text-foreground/80 transition-[color,background-color] duration-150 hover:bg-surface hover:text-foreground dark:hover:bg-white/12"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Composer: a glass bar at the foot of the panel, so the sky still
              shows through beneath the input rather than a flat strip. */}
          <div className="glass-bar shrink-0 border-t">
            <div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6">
              {error && (
                <p className="mb-2 text-[12px] text-destructive">{error}</p>
              )}

              {speech.listening && (
                <p className="mb-2 flex items-center gap-2 text-[12px] text-primary">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  Listening — speak now
                </p>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${agentName}…`}
                  className="glass-pill field-sizing-content max-h-32 min-w-0 flex-1 resize-none rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/16"
                />

                {voiceEnabled && speech.supported && (
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : startDictation}
                    aria-label={speech.listening ? "Stop listening" : "Speak"}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-150 active:scale-95",
                      speech.listening
                        ? "glossy border-transparent bg-primary text-primary-foreground"
                        : "glass-pill text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {speech.listening ? (
                      <Square className="size-3.5" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                  className="glossy flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:shadow-none"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </button>
              </form>

              {speech.error && (
                <p className="mt-2 text-center text-[11px] text-destructive">
                  {speech.error}
                </p>
              )}

              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {agentName} answers from this company's knowledge base and
                brings in a person when it isn't sure.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Dot() {
  return (
    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
      AI
    </span>
  );
}

function Bubble({
  message,
  agentName,
}: {
  message: Message;
  agentName: string;
}) {
  const isVisitor = message.role === "visitor";
  const isHuman = message.role === "human";

  if (message.role === "system") {
    return (
      <p className="text-center text-[11.5px] text-muted-foreground">
        {message.content}
      </p>
    );
  }

  return (
    <div className={cn("animate-pop flex gap-2.5", isVisitor && "flex-row-reverse")}>
      {!isVisitor && (
        <span
          className={cn(
            "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            isHuman
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-primary/12 text-primary",
          )}
        >
          {isHuman ? <UserRound className="size-3" /> : "AI"}
        </span>
      )}

      <div className={cn("max-w-[84%] space-y-1", isVisitor && "items-end")}>
        <div
          className={cn(
            "px-3.5 py-2.5 text-[14px] leading-relaxed",
            // The visitor's words are lit azure; the assistant's are frosted
            // glass over the sky, so the two voices are told apart by material
            // as much as by side.
            isVisitor
              ? "glossy rounded-2xl rounded-tr-md bg-primary text-primary-foreground"
              : "glass-pill rounded-2xl rounded-tl-md text-foreground",
          )}
        >
          {message.content}
        </div>
        <p
          className={cn(
            "px-1 text-[10.5px] text-muted-foreground",
            isVisitor && "text-right",
          )}
        >
          {isVisitor ? "You" : isHuman ? "Support team" : agentName}
          {message.createdAt && ` · ${clockTime(message.createdAt)}`}
        </p>
      </div>
    </div>
  );
}
