import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAgentConfig } from "@/lib/agent-config";

type Params = { params: Promise<{ slug: string }> };

/** A teammate seen within this window counts as online. */
export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Public: the assistant's presentation settings for an organization.
 * Deliberately exposes only what the widget needs to render — never the
 * provider, model or API key.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, suspended: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A suspended tenant's assistant is offline to the public. Staff are told
  // why inside the app; visitors just see that it's unavailable.
  if (org.suspended) {
    return NextResponse.json(
      { error: "This assistant is currently unavailable." },
      { status: 503 }
    );
  }

  const [config, online] = await Promise.all([
    getAgentConfig(org.id),
    db.membership.count({
      where: {
        orgId: org.id,
        lastSeenAt: { gte: new Date(Date.now() - PRESENCE_WINDOW_MS) },
      },
    }),
  ]);

  return NextResponse.json({
    org: { id: org.id, name: org.name, slug: org.slug },
    agent: {
      agentName: config.agentName,
      greeting: config.greeting,
      voiceEnabled: config.voiceEnabled,
      collectVisitorDetails: config.collectVisitorDetails,
    },
    // Lets the widget set honest expectations about a hand-off.
    teamOnline: online > 0,
  });
}
