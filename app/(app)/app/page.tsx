import Link from "next/link";
import { ArrowUpRight, BookOpen, LifeBuoy, Sparkles } from "lucide-react";
import { OverviewChart } from "@/components/app/overview-chart";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusPill } from "@/components/app/status-pill";
import { ConfidenceBar } from "@/components/app/confidence";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getAgentConfig } from "@/lib/agent-config";
import { sweepOverdueEscalations } from "@/lib/escalations";
import { countdown, localDateKey, percent, relativeTime } from "@/lib/format";
import { ESCALATION_REASONS } from "@/lib/constants";

export const metadata = { title: "Overview" };

const WINDOW_DAYS = 14;

export default async function OverviewPage() {
  const session = await requireSession();
  const orgId = session.org.id;

  await sweepOverdueEscalations(orgId);

  const since = new Date();
  since.setDate(since.getDate() - (WINDOW_DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const [conversations, escalations, assistantMessages, articles, queue] =
    await Promise.all([
      db.conversation.findMany({
        where: { orgId, createdAt: { gte: since } },
        select: { id: true, createdAt: true, status: true },
      }),
      db.escalation.findMany({
        where: { orgId },
        select: {
          status: true,
          reason: true,
          createdAt: true,
          answeredAt: true,
          conversationId: true,
        },
      }),
      db.message.findMany({
        where: {
          role: "assistant",
          confidence: { not: null },
          createdAt: { gte: since },
          conversation: { orgId },
        },
        select: { confidence: true },
      }),
      db.knowledgeArticle.findMany({
        where: { orgId },
        select: { id: true, question: true, useCount: true, source: true },
        orderBy: { useCount: "desc" },
      }),
      db.escalation.findMany({
        where: { orgId, status: "pending" },
        orderBy: { dueAt: "asc" },
        take: 4,
        select: {
          id: true,
          question: true,
          confidence: true,
          reason: true,
          dueAt: true,
          createdAt: true,
        },
      }),
    ]);

  const config = await getAgentConfig(orgId);

  // Zero-filled daily buckets so the chart's x-axis stays continuous.
  const days = Array.from({ length: WINDOW_DAYS }, (_, offset) => {
    const day = new Date(since);
    day.setDate(day.getDate() + offset);
    return {
      date: localDateKey(day),
      label: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      conversations: 0,
      escalations: 0,
    };
  });
  const dayIndex = new Map(days.map((day, index) => [day.date, index]));

  for (const conversation of conversations) {
    const index = dayIndex.get(localDateKey(conversation.createdAt));
    if (index !== undefined) days[index].conversations += 1;
  }

  const escalationsInWindow = escalations.filter(
    (escalation) => escalation.createdAt >= since
  );
  const conversationIds = new Set(conversations.map((c) => c.id));
  for (const escalation of escalationsInWindow) {
    const index = dayIndex.get(localDateKey(escalation.createdAt));
    if (index !== undefined) days[index].escalations += 1;
  }

  const total = conversations.length;

  // Count *conversations that needed a human*, not escalation rows: a single
  // conversation can escalate more than once, and an escalation may belong to
  // a conversation started before this window. Comparing the two directly
  // could push the rate above 100% and render as a negative percentage.
  const escalatedConversations = new Set(
    escalationsInWindow
      .map((escalation) => escalation.conversationId)
      .filter((id) => conversationIds.has(id))
  );
  const handledAlone = total - escalatedConversations.size;
  const autoResolveRate = total > 0 ? handledAlone / total : 0;

  const averageConfidence =
    assistantMessages.length > 0
      ? assistantMessages.reduce(
          (sum, message) => sum + (message.confidence ?? 0),
          0
        ) / assistantMessages.length
      : 0;

  const answered = escalations.filter(
    (escalation) => escalation.status === "answered" && escalation.answeredAt
  );
  const responseMinutes = answered.map(
    (escalation) =>
      (escalation.answeredAt!.getTime() - escalation.createdAt.getTime()) / 60000
  );
  const medianResponse = median(responseMinutes);

  const pendingCount = escalations.filter((e) => e.status === "pending").length;
  const missedCount = escalations.filter((e) => e.status === "missed").length;
  const learnedCount = articles.filter((a) => a.source === "learned").length;

  const usingLocalEngine = config.provider === "local";

  return (
    <div className="space-y-7 animate-rise">
      <PageHeader
        title={`Good to see you, ${session.user.name.split(" ")[0]}`}
        description={`How ${config.agentName} has been doing over the last ${WINDOW_DAYS} days.`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/w/${session.org.slug}`} target="_blank">
              Open assistant
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {usingLocalEngine && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">
              Running on the built-in engine
            </p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Answers come straight from your knowledge base. Add a model key to
              let {config.agentName} phrase replies in its own words.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm" className="shrink-0">
            <Link href="/app/assistant">Configure</Link>
          </Button>
        </div>
      )}

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Handled by AI"
          value={total > 0 ? percent(autoResolveRate) : "—"}
          hint={
            total > 0
              ? `${handledAlone} of ${total} conversations`
              : "No conversations yet"
          }
          tone={autoResolveRate >= 0.7 ? "positive" : "neutral"}
        />
        <StatCard
          label="Avg confidence"
          value={assistantMessages.length > 0 ? percent(averageConfidence) : "—"}
          hint={`Escalates below ${percent(config.confidenceThreshold)}`}
        />
        <StatCard
          label="Awaiting a human"
          value={String(pendingCount)}
          hint={pendingCount > 0 ? "In the escalation queue" : "Queue is clear"}
          tone={pendingCount > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Median reply"
          value={
            responseMinutes.length > 0 ? `${Math.round(medianResponse)}m` : "—"
          }
          hint={
            missedCount > 0
              ? `${missedCount} missed the window`
              : "Within the SLA window"
          }
          tone={missedCount > 0 ? "danger" : "positive"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Conversation volume</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">
              The gap between the lines is what {config.agentName} handled alone.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-1" />
              Total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-4" />
              Escalated
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {total > 0 ? (
            <OverviewChart days={days} />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No conversations yet"
              description="Open your assistant and ask it something — it'll show up here."
              action={
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/w/${session.org.slug}`} target="_blank">
                    Try the assistant
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Needs a human</CardTitle>
            {pendingCount > 0 && (
              <Button asChild variant="subtle" size="sm">
                <Link href="/app/escalations">
                  View all {pendingCount}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <EmptyState
                icon={LifeBuoy}
                title="Nothing waiting"
                description={`${config.agentName} has answered everything it's been asked.`}
              />
            ) : (
              <ul className="divide-y divide-border">
                {queue.map((escalation) => {
                  const due = countdown(escalation.dueAt);
                  return (
                    <li key={escalation.id}>
                      <Link
                        href="/app/escalations"
                        className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-accent/50"
                      >
                        <p className="line-clamp-2 text-[13px] leading-relaxed">
                          {escalation.question}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <ConfidenceBar confidence={escalation.confidence} />
                          <Badge variant="outline">
                            {ESCALATION_REASONS[
                              escalation.reason as keyof typeof ESCALATION_REASONS
                            ] ?? escalation.reason}
                          </Badge>
                          <span
                            className={
                              due.overdue
                                ? "text-[11px] font-medium text-red-600 dark:text-red-400"
                                : "text-[11px] text-muted-foreground"
                            }
                          >
                            {due.label}
                          </span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {relativeTime(escalation.createdAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why it escalates</CardTitle>
          </CardHeader>
          <CardContent>
            {escalations.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">
                No escalations yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(
                  escalations.reduce<Record<string, number>>((totals, e) => {
                    totals[e.reason] = (totals[e.reason] ?? 0) + 1;
                    return totals;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <li key={reason} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[12.5px]">
                          {ESCALATION_REASONS[
                            reason as keyof typeof ESCALATION_REASONS
                          ] ?? reason}
                        </span>
                        <span className="tabular text-[11px] text-muted-foreground">
                          {count}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{
                            width: `${(count / escalations.length) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="tabular text-[26px] font-semibold leading-none tracking-[-0.02em]">
                  {articles.length}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  articles
                  {learnedCount > 0 && ` · ${learnedCount} learned from your team`}
                </span>
              </div>

              {articles.length === 0 ? (
                <Button asChild size="sm" variant="secondary" className="w-full">
                  <Link href="/app/knowledge">
                    <BookOpen className="size-3.5" />
                    Add your first article
                  </Link>
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Most used
                  </p>
                  <ul className="space-y-2">
                    {articles.slice(0, 4).map((article) => (
                      <li
                        key={article.id}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="line-clamp-1 text-[12.5px]">
                          {article.question}
                        </span>
                        <span className="tabular shrink-0 text-[11px] text-muted-foreground">
                          {article.useCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[12.5px]">
              <Row label="Name" value={config.agentName} />
              <Row
                label="Engine"
                value={
                  config.provider === "local"
                    ? "Built-in"
                    : `${config.provider} · ${config.model}`
                }
              />
              <Row
                label="Threshold"
                value={percent(config.confidenceThreshold)}
              />
              <Row label="SLA" value={`${config.escalationTimeout} min`} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Status</span>
                <StatusPill status="active" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
