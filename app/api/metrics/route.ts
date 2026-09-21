import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { sweepOverdueEscalations } from "@/lib/escalations";
import { localDateKey } from "@/lib/format";

const DAYS = 14;

export async function GET() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const orgId = auth.session.org.id;
  await sweepOverdueEscalations(orgId);

  const since = new Date();
  since.setDate(since.getDate() - (DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const [conversations, escalations, articles, assistantMessages] =
    await Promise.all([
      db.conversation.findMany({
        where: { orgId, createdAt: { gte: since } },
        select: { id: true, createdAt: true, status: true, channel: true },
      }),
      db.escalation.findMany({
        where: { orgId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          answeredAt: true,
          reason: true,
          confidence: true,
          conversationId: true,
        },
      }),
      db.knowledgeArticle.findMany({
        where: { orgId },
        select: {
          id: true,
          question: true,
          category: true,
          source: true,
          useCount: true,
        },
        orderBy: { useCount: "desc" },
      }),
      db.message.findMany({
        where: {
          role: "assistant",
          confidence: { not: null },
          conversation: { orgId },
          createdAt: { gte: since },
        },
        select: { confidence: true, createdAt: true },
      }),
    ]);

  // Daily series for the trend chart, zero-filled so the axis is continuous.
  const days: {
    date: string;
    label: string;
    conversations: number;
    escalations: number;
    resolved: number;
  }[] = [];

  for (let offset = 0; offset < DAYS; offset += 1) {
    const day = new Date(since);
    day.setDate(day.getDate() + offset);
    days.push({
      date: localDateKey(day),
      label: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      conversations: 0,
      escalations: 0,
      resolved: 0,
    });
  }

  const dayIndex = new Map(days.map((day, index) => [day.date, index]));

  for (const conversation of conversations) {
    const index = dayIndex.get(localDateKey(conversation.createdAt));
    if (index === undefined) continue;
    days[index].conversations += 1;
    if (conversation.status === "resolved") days[index].resolved += 1;
  }

  for (const escalation of escalations) {
    const index = dayIndex.get(localDateKey(escalation.createdAt));
    if (index !== undefined) days[index].escalations += 1;
  }

  const answered = escalations.filter(
    (escalation) => escalation.status === "answered" && escalation.answeredAt
  );

  const responseMinutes = answered.map(
    (escalation) =>
      (escalation.answeredAt!.getTime() - escalation.createdAt.getTime()) / 60000
  );

  const totalConversations = conversations.length;
  const escalationsInWindow = escalations.filter(
    (escalation) => escalation.createdAt >= since
  );

  // Distinct conversations that needed a human — see the note in the dashboard
  // page: dividing escalation rows by conversations can exceed 1.
  const conversationIds = new Set(conversations.map((c) => c.id));
  const escalatedConversations = new Set(
    escalationsInWindow
      .map((escalation) => escalation.conversationId)
      .filter((id) => conversationIds.has(id))
  );
  const escalatedInWindow = escalationsInWindow.length;

  const averageConfidence =
    assistantMessages.length > 0
      ? assistantMessages.reduce(
          (sum, message) => sum + (message.confidence ?? 0),
          0
        ) / assistantMessages.length
      : 0;

  const channelCounts = conversations.reduce<Record<string, number>>(
    (totals, conversation) => {
      totals[conversation.channel] = (totals[conversation.channel] ?? 0) + 1;
      return totals;
    },
    {}
  );

  return NextResponse.json({
    window: { days: DAYS, since: since.toISOString() },
    totals: {
      conversations: totalConversations,
      // The headline number: share the assistant handled without a human.
      autoResolveRate:
        totalConversations > 0
          ? (totalConversations - escalatedConversations.size) /
            totalConversations
          : 0,
      escalations: escalatedInWindow,
      pending: escalations.filter((e) => e.status === "pending").length,
      missed: escalations.filter((e) => e.status === "missed").length,
      averageConfidence,
      medianResponseMinutes: median(responseMinutes),
      articles: articles.length,
      learnedArticles: articles.filter((a) => a.source === "learned").length,
    },
    days,
    channels: channelCounts,
    topArticles: articles.slice(0, 5),
    escalationReasons: escalations.reduce<Record<string, number>>(
      (totals, escalation) => {
        totals[escalation.reason] = (totals[escalation.reason] ?? 0) + 1;
        return totals;
      },
      {}
    ),
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
