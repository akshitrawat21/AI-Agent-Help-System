"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  BookOpen,
  Check,
  Phone,
  Clock,
  Loader2,
  MessageSquare,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarBadge } from "@/components/app/avatar-badge";
import { ConfidenceBar } from "@/components/app/confidence";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLiveEvents } from "@/hooks/use-live-events";
import { ESCALATION_REASONS, KB_CATEGORIES } from "@/lib/constants";
import { clockTime, countdown, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type QueueEscalation = {
  id: string;
  question: string;
  draftAnswer: string | null;
  confidence: number;
  reason: string;
  status: string;
  answer: string | null;
  createdAt: string;
  dueAt: string;
  answeredAt: string | null;
  assignee: { id: string; name: string; avatarColor: string } | null;
  conversation: {
    id: string;
    channel: string;
    visitorName?: string | null;
    visitorEmail?: string | null;
    messages: {
      id: string;
      role: string;
      content: string;
      confidence: number | null;
      createdAt: string;
    }[];
  };
};

const FILTERS = [
  { value: "pending", label: "Waiting" },
  { value: "mine", label: "Mine" },
  { value: "answered", label: "Answered" },
  { value: "missed", label: "Missed" },
  { value: "all", label: "All" },
] as const;

export function EscalationQueue({
  initial,
  autoLearn,
  currentUserId,
}: {
  initial: QueueEscalation[];
  autoLearn: boolean;
  /** The viewer, for the "Mine" filter and claim state. */
  currentUserId: string;
}) {
  const router = useRouter();
  const [escalations, setEscalations] = useState(initial);
  const [filter, setFilter] = useState<string>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.find((item) => item.status === "pending")?.id ?? initial[0]?.id ?? null
  );
  const [loading, setLoading] = useState(false);

  const load = async (status: string): Promise<QueueEscalation[]> => {
    setLoading(true);
    try {
      // "Mine" is a view over the pending queue, not a server status.
      const response = await fetch(
        `/api/escalations?status=${status === "mine" ? "pending" : status}`
      );
      if (!response.ok) {
        // An expired session or a server error must not leave callers
        // dereferencing undefined — hand back an empty list either way.
        toast.error(
          response.status === 401
            ? "Your session expired — sign in again"
            : "Couldn't load the queue"
        );
        return [];
      }

      const payload = await response.json();
      const fresh: QueueEscalation[] = payload.escalations ?? [];
      setEscalations(fresh);
      return fresh;
    } catch {
      toast.error("Couldn't reach the server");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // A new escalation arriving while the queue is open should just appear.
  useLiveEvents((event) => {
    if (event.type.startsWith("escalation.")) {
      load(filter).then((fresh) => {
        if (!fresh.some((item) => item.id === selectedId)) {
          setSelectedId(fresh[0]?.id ?? null);
        }
      });
    }
  });

  const selected = useMemo(
    () => escalations.find((item) => item.id === selectedId) ?? null,
    [escalations, selectedId]
  );

  const visible =
    filter === "mine"
      ? escalations.filter((item) => item.assignee?.id === currentUserId)
      : escalations;

  const changeFilter = async (next: string) => {
    setFilter(next);
    const fresh = await load(next);
    setSelectedId(fresh[0]?.id ?? null);
  };

  const onAnswered = async () => {
    const fresh = await load(filter);
    setSelectedId(fresh[0]?.id ?? null);
    router.refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* Queue list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
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
          {loading && escalations.length === 0 ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Check}
              title={filter === "pending" ? "Queue is clear" : "Nothing here"}
              description={
                filter === "pending"
                  ? "Every question has been answered."
                  : "No escalations match this filter."
              }
            />
          ) : (
            <ul className="stagger divide-y divide-border">
              {visible.map((escalation) => {
                const active = escalation.id === selectedId;
                const due = countdown(escalation.dueAt);

                return (
                  <li key={escalation.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(escalation.id)}
                      className={cn(
                        "w-full space-y-2 px-4 py-3 text-left transition-colors duration-150",
                        active ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <p className="line-clamp-2 text-[13px] leading-snug">
                        {escalation.question}
                      </p>
                      {(escalation.conversation.visitorName ||
                        escalation.conversation.visitorEmail) && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[
                            escalation.conversation.visitorName,
                            escalation.conversation.visitorEmail,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {escalation.conversation.channel === "voice" && (
                          <Phone className="size-3 shrink-0 text-primary" />
                        )}
                        <ConfidenceBar
                          confidence={escalation.confidence}
                          showValue={false}
                        />
                        {escalation.status === "pending" ? (
                          <span
                            className={cn(
                              "text-[11px]",
                              due.overdue
                                ? "font-medium text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {due.label}
                          </span>
                        ) : (
                          <Badge
                            variant={
                              escalation.status === "answered"
                                ? "success"
                                : "danger"
                            }
                          >
                            {escalation.status === "answered"
                              ? "Answered"
                              : "Missed"}
                          </Badge>
                        )}
                        {escalation.status === "pending" &&
                          escalation.assignee && (
                            <AvatarBadge
                              name={escalation.assignee.name}
                              color={escalation.assignee.avatarColor}
                              size="sm"
                              className="size-5 text-[9px]"
                            />
                          )}
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {relativeTime(escalation.createdAt)}
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

      {/* Detail */}
      {selected ? (
        <EscalationDetail
          key={selected.id}
          escalation={selected}
          autoLearn={autoLearn}
          currentUserId={currentUserId}
          onAnswered={onAnswered}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={MessageSquare}
            title="Nothing selected"
            description="Pick a question from the queue to see the conversation and answer it."
          />
        </div>
      )}
    </div>
  );
}

function EscalationDetail({
  escalation,
  autoLearn,
  currentUserId,
  onAnswered,
}: {
  escalation: QueueEscalation;
  autoLearn: boolean;
  currentUserId: string;
  onAnswered: () => void;
}) {
  // Deliberately NOT pre-filled with the draft. The draft was withheld because
  // the assistant wasn't confident in it, so it's shown separately and adopted
  // only on purpose — pre-filling would invite sending it through unread.
  const [answer, setAnswer] = useState("");
  const [saveToKnowledge, setSaveToKnowledge] = useState(autoLearn);
  const [category, setCategory] = useState<string>("General");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const due = countdown(escalation.dueAt);
  const mine = escalation.assignee?.id === currentUserId;

  /** Take (or hand back) this escalation, so the team can see who has it. */
  const claim = async (release: boolean) => {
    setClaiming(true);
    const response = await fetch(`/api/escalations/${escalation.id}/claim`, {
      method: release ? "DELETE" : "POST",
    });
    setClaiming(false);

    if (!response.ok) {
      toast.error("Couldn't update that claim");
      return;
    }
    toast.success(release ? "Released back to the queue" : "It's yours");
    onAnswered();
  };
  const answerable = escalation.status !== "answered";

  const submit = async () => {
    if (!answer.trim()) {
      setError("Write an answer first");
      return;
    }

    setBusy(true);
    setError(null);

    const response = await fetch(`/api/escalations/${escalation.id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, saveToKnowledge, category }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? payload.errors?.answer ?? "Couldn't send that");
      setBusy(false);
      return;
    }

    const payload = await response.json();
    toast.success("Answer sent", {
      description: payload.learned
        ? "Saved to your knowledge base — the assistant can handle this next time."
        : "Delivered to the visitor.",
    });

    setBusy(false);
    onAnswered();
  };

  return (
    <div className="space-y-4 animate-rise">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-4">
          <Badge variant="outline">
            {ESCALATION_REASONS[
              escalation.reason as keyof typeof ESCALATION_REASONS
            ] ?? escalation.reason}
          </Badge>
          <ConfidenceBar confidence={escalation.confidence} />
          {escalation.conversation.channel === "voice" ? (
            <Badge variant="primary">
              <Phone className="size-2.5" />
              Live call
            </Badge>
          ) : (
            <Badge variant="outline">
              <MessageSquare className="size-2.5" />
              Chat
            </Badge>
          )}
          {(escalation.conversation.visitorName ||
            escalation.conversation.visitorEmail) && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="size-3" />
              {[
                escalation.conversation.visitorName,
                escalation.conversation.visitorEmail,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          {escalation.status === "pending" ? (
            <span className="ml-auto flex items-center gap-2">
              {escalation.assignee && !mine && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <AvatarBadge
                    name={escalation.assignee.name}
                    color={escalation.assignee.avatarColor}
                    size="sm"
                    className="size-5 text-[9px]"
                  />
                  {escalation.assignee.name} has this
                </span>
              )}
              <Button
                variant={mine ? "secondary" : "outline"}
                size="sm"
                onClick={() => claim(mine)}
                disabled={claiming}
              >
                {claiming ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserCheck className="size-3.5" />
                )}
                {mine ? "Release" : escalation.assignee ? "Take over" : "Claim"}
              </Button>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[11px]",
                  due.overdue
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                <Clock className="size-3" />
                {due.label}
              </span>
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {escalation.assignee && (
                <>
                  <AvatarBadge
                    name={escalation.assignee.name}
                    color={escalation.assignee.avatarColor}
                    size="sm"
                    className="size-5 text-[9px]"
                  />
                  {escalation.assignee.name}
                </>
              )}
              {escalation.answeredAt && ` · ${relativeTime(escalation.answeredAt)}`}
            </span>
          )}
        </div>

        {/* Transcript */}
        <div className="max-h-[340px] space-y-3 overflow-y-auto p-4">
          {escalation.conversation.messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      {/* The assistant's withheld draft, shown to the teammate only */}
      {escalation.draftAnswer && answerable && (
        <div className="rounded-xl border border-border bg-surface-sunken p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <p className="text-[12px] font-medium">
              What the assistant wanted to say
            </p>
            <span className="text-[11px] text-muted-foreground">
              held back — below your threshold
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {escalation.draftAnswer}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setAnswer(escalation.draftAnswer ?? "")}
          >
            <ArrowDown className="size-3.5" />
            Use as a starting point
          </Button>
        </div>
      )}

      {answerable ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Label htmlFor="answer">Your answer</Label>
          <Textarea
            id="answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={
              escalation.conversation.channel === "voice"
                ? "Answer the caller. This is read aloud to them, and they can reply by voice."
                : "Answer the visitor directly. This is sent to them as-is."
            }
            className="min-h-28"
            aria-invalid={Boolean(error)}
            autoFocus
          />
          {escalation.conversation.channel === "voice" && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Phone className="size-3" />
              They're on a voice call — your reply is spoken to them, and the
              conversation stays open so you can keep talking.
            </p>
          )}
          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="learn"
                checked={saveToKnowledge}
                onCheckedChange={(checked) =>
                  setSaveToKnowledge(checked === true)
                }
              />
              <Label
                htmlFor="learn"
                className="flex items-center gap-1.5 font-normal text-muted-foreground"
              >
                <BookOpen className="size-3.5" />
                Teach the assistant this answer
              </Label>
            </div>

            {saveToKnowledge && (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger size="sm" className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KB_CATEGORIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={submit}
              disabled={busy}
              className="sm:ml-auto"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Send answer
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">
            Answer sent
          </p>
          <p className="text-[13px] leading-relaxed">{escalation.answer}</p>
        </div>
      )}
    </div>
  );
}

function Bubble({
  message,
}: {
  message: {
    role: string;
    content: string;
    confidence: number | null;
    createdAt: string;
  };
}) {
  const isVisitor = message.role === "visitor";

  const meta = {
    visitor: { icon: User, label: "Visitor" },
    assistant: { icon: Sparkles, label: "Assistant" },
    human: { icon: User, label: "Teammate" },
    system: { icon: Clock, label: "System" },
  }[message.role] ?? { icon: User, label: message.role };

  const Icon = meta.icon;

  return (
    <div className={cn("flex gap-2.5", !isVisitor && "flex-row-reverse")}>
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
        <Icon className="size-3 text-muted-foreground" />
      </span>
      <div className={cn("max-w-[80%] space-y-1", !isVisitor && "items-end")}>
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-[13px] leading-relaxed",
            isVisitor
              ? "bg-surface-sunken"
              : "bg-primary/8 dark:bg-primary/12"
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
          <span>{meta.label}</span>
          <span>{clockTime(message.createdAt)}</span>
          {message.confidence !== null && (
            <span className="tabular">
              {Math.round(message.confidence * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
