import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AssistantChat } from "@/components/widget/assistant-chat";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { getAgentConfig } from "@/lib/agent-config";
import { db } from "@/lib/db";
import { PRESENCE_WINDOW_MS } from "@/app/api/widget/[slug]/route";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const org = await db.organization.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: org ? `${org.name} support` : "Support",
    description: org ? `Get help from ${org.name}.` : undefined,
  };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * The customer-facing surface. Public — no session required.
 *
 * Laid out as a frosted panel floating over a soft sky, so it reads as one
 * object rather than a page: the same idea as a product window sitting in
 * front of a landscape, at the scale of a support conversation.
 */
export default async function WidgetPage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, suspended: true },
  });
  if (!org) notFound();

  if (org.suspended) {
    return (
      <div className="sky-soft flex h-svh items-center justify-center px-6">
        <div className="glass-panel max-w-sm rounded-3xl p-8 text-center">
          <p className="text-[15px] font-semibold">{org.name}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            This assistant is currently unavailable. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  const [config, popular, online] = await Promise.all([
    getAgentConfig(org.id),
    // Seed the starter chips from the most-used articles, so the prompts a
    // visitor sees are ones the assistant can actually answer well.
    db.knowledgeArticle.findMany({
      where: { orgId: org.id },
      orderBy: { useCount: "desc" },
      take: 3,
      select: { question: true },
    }),
    db.membership.count({
      where: {
        orgId: org.id,
        lastSeenAt: { gte: new Date(Date.now() - PRESENCE_WINDOW_MS) },
      },
    }),
  ]);

  // Identity the host site passed through the embed script, if any.
  const visitor = {
    name: first(query.name).slice(0, 80),
    email: first(query.email).slice(0, 200),
  };
  const teamOnline = online > 0;

  return (
    <div className="sky-soft flex h-svh flex-col">
      <header className="glass-bar z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <span className="glossy flex size-7 items-center justify-center rounded-lg bg-primary text-[12px] font-semibold text-primary-foreground">
          {org.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
            {org.name}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${teamOnline ? "pulse-dot bg-emerald-500" : "bg-primary"}`}
            />
            {teamOnline
              ? `${config.agentName} and the team are online`
              : `${config.agentName} is online`}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center px-3 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-6">
        <div className="glass-panel flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-3xl">
          <AssistantChat
            slug={org.slug}
            agentName={config.agentName}
            greeting={config.greeting}
            voiceEnabled={config.voiceEnabled}
            suggestions={popular.map((article) => article.question)}
            visitor={visitor}
            collectVisitorDetails={config.collectVisitorDetails}
            teamOnline={teamOnline}
          />
        </div>
      </div>
    </div>
  );
}
