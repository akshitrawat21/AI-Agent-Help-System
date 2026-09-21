"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Inbox as InboxIcon,
  Loader2,
  Mic,
  Phone,
  Search,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarBadge } from "@/components/app/avatar-badge";
import { ConfidenceBar } from "@/components/app/confidence";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill } from "@/components/app/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLiveEvents } from "@/hooks/use-live-events";
import { clockTime, relativeTime, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ConversationSummary = {
  id: string;
  title: string;
  channel: string;
  status: string;
  updatedAt: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
  _count: { messages: number };
  messages: {
    role: string;
    content: string;
    confidence: number | null;
    createdAt: string;
  }[];
  escalations: { id: string }[];
};

type Message = {
  id: string;
  role: string;
  content: string;
  confidence: number | null;
  createdAt: string;
  author: { id: string; name: string; avatarColor: string } | null;
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
] as const;

export function Inbox({ initial }: { initial: ConversationSummary[] }) {
  const [conversations, setConversations] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null
  );
  const [loading, setLoading] = useState(false);

  const load = async (status: string, query: string) => {
    setLoading(true);
    const params = new URLSearchParams({ status });
    if (query) params.set("search", query);

    const response = await fetch(`/api/conversations?${params}`);
    const payload = await response.json();
    setConversations(payload.conversations ?? []);
    setLoading(false);
  };

  // Debounce typing, but refetch immediately when the box is cleared —
  // returning early on the empty transition would leave the list filtered
  // with nothing in the input to explain why.
  useEffect(() => {
    const timer = setTimeout(() => load(filter, search), search ? 250 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useLiveEvents((event) => {
    if (event.type === "message.created" || event.type === "escalation.created") {
      load(filter, search);
    }
  });

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            className="pl-8.5"
          />
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                load(option.value, search);
              }}
              className={cn(
                "flex-1 rounded-[6px] px-2 py-1.5 text-[12px] font-medium transition-colors duration-150",
                filter === option.value
                  ? "bg-surface text-foreground shadow-[0_1px_2px_oklch(0_0_0/0.06)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="No conversations"
              description={
                search
                  ? "Nothing matches that search."
                  : "Conversations appear here as soon as visitors start asking."
              }
            />
          ) : (
            <ul className="stagger divide-y divide-border">
              {conversations.map((conversation) => {
                const active = conversation.id === selectedId;
                const last = conversation.messages[0];

                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        "w-full space-y-1.5 px-4 py-3 text-left transition-colors duration-150",
                        active ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <p className="line-clamp-1 flex-1 text-[13px] font-medium">
                          {conversation.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {shortDate(conversation.updatedAt)}
                        </span>
                      </div>
                      {last && (
                        <p className="line-clamp-1 text-[12px] text-muted-foreground">
                          {last.role !== "visitor" && (
                            <span className="text-muted-foreground/70">
                              {last.role === "human" ? "Team: " : "Assistant: "}
                            </span>
                          )}
                          {last.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <StatusPill status={conversation.status} />
                        {conversation.channel === "voice" && (
                          <Mic className="size-3 text-muted-foreground" />
                        )}
                        <span className="ml-auto tabular text-[11px] text-muted-foreground">
                          {conversation._count.messages} msg
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selected ? (
        <ConversationDetail
          key={selected.id}
          summary={selected}
          onChanged={() => load(filter, search)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={InboxIcon}
            title="Nothing selected"
            description="Choose a conversation to read the transcript and reply."
          />
        </div>
      )}
    </div>
  );
}

function ConversationDetail({
  summary,
  onChanged,
}: {
  summary: ConversationSummary;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<
    { id: string; question: string; category: string }[]
  >([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  /** Ends a live conversation — the visitor stops seeing it as open. */
  const close = async () => {
    setClosing(true);
    const response = await fetch(`/api/conversations/${summary.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    setClosing(false);

    if (!response.ok) {
      toast.error("Couldn't close that conversation");
      return;
    }
    toast.success("Conversation closed");
    onChanged();
  };

  const load = async () => {
    const response = await fetch(`/api/conversations/${summary.id}`);
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setMessages(payload.conversation.messages);
    setSources(payload.sources ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.id]);

  useLiveEvents((event) => {
    if (
      event.type === "message.created" &&
      event.conversationId === summary.id
    ) {
      load();
    }
  });

  const send = async () => {
    if (!reply.trim()) return;

    setSending(true);
    const response = await fetch(`/api/conversations/${summary.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    });

    if (!response.ok) {
      toast.error("Couldn't send that reply");
      setSending(false);
      return;
    }

    setReply("");
    setSending(false);
    await load();
    onChanged();
    toast.success("Reply sent");
  };

  return (
    <div className="flex flex-col gap-4 animate-rise">
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">{summary.title}</p>
            {(summary.visitorName || summary.visitorEmail) && (
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {[summary.visitorName, summary.visitorEmail]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <StatusPill status={summary.status} />
              <span>· {summary.channel}</span>
              <span>· {relativeTime(summary.updatedAt)}</span>
            </p>
          </div>
          {summary.channel === "voice" && (
            <Badge variant="primary">
              <Phone className="size-2.5" />
              Voice
            </Badge>
          )}
          {summary.escalations.length > 0 && (
            <Badge variant="warning">Waiting on a human</Badge>
          )}
          {(summary.status === "live" || summary.status === "waiting") && (
            <Button
              variant="outline"
              size="sm"
              onClick={close}
              disabled={closing}
              className="shrink-0"
            >
              {closing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Close
            </Button>
          )}
        </div>

        <div className="max-h-[400px] min-h-[200px] space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-border p-4">
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={
              summary.channel === "voice"
                ? "Reply as a teammate — this is read aloud to the caller."
                : "Reply as a teammate — this is delivered to the visitor."
            }
            className="min-h-20"
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter for a newline, like every chat app.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground">
              Enter to send · Shift+Enter for a new line
            </p>
            <Button
              onClick={send}
              disabled={sending || !reply.trim()}
              size="sm"
              className="ml-auto"
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Knowledge used
          </p>
          <ul className="space-y-1.5">
            {sources.map((source) => (
              <li key={source.id} className="flex items-center gap-2">
                <Badge variant="outline">{source.category}</Badge>
                <span className="line-clamp-1 text-[12.5px]">
                  {source.question}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  const isVisitor = message.role === "visitor";

  return (
    <div className={cn("flex gap-2.5", !isVisitor && "flex-row-reverse")}>
      {message.author ? (
        <AvatarBadge
          name={message.author.name}
          color={message.author.avatarColor}
          size="sm"
          className="mt-0.5 size-6"
        />
      ) : (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
          {isVisitor ? (
            <User className="size-3 text-muted-foreground" />
          ) : (
            <Sparkles className="size-3 text-primary" />
          )}
        </span>
      )}

      <div className="max-w-[80%] space-y-1">
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-[13px] leading-relaxed",
            isVisitor ? "bg-surface-sunken" : "bg-primary/8 dark:bg-primary/12"
          )}
        >
          {message.content}
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-1 text-[10.5px] text-muted-foreground",
            !isVisitor && "justify-end"
          )}
        >
          <span>
            {isVisitor
              ? "Visitor"
              : message.author?.name ?? "Assistant"}
          </span>
          <span>{clockTime(message.createdAt)}</span>
          {message.confidence !== null && (
            <ConfidenceBar
              confidence={message.confidence}
              className="scale-90"
            />
          )}
        </div>
      </div>
    </div>
  );
}
