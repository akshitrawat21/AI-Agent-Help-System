import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { fieldErrors, inviteSchema } from "@/lib/validation";

export async function GET() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const memberships = await db.membership.findMany({
    where: { orgId: auth.session.org.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarColor: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const answered = await db.escalation.groupBy({
    by: ["assigneeId"],
    where: { orgId: auth.session.org.id, status: "answered" },
    _count: { _all: true },
  });

  const answeredByUser = Object.fromEntries(
    answered
      .filter((entry) => entry.assigneeId)
      .map((entry) => [entry.assigneeId as string, entry._count._all])
  );

  return NextResponse.json({
    members: memberships.map((membership) => ({
      // The membership id is what role changes and removals act on; the user
      // id is only for display and lookups.
      membershipId: membership.id,
      role: membership.role,
      joinedAt: membership.createdAt,
      answered: answeredByUser[membership.user.id] ?? 0,
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      avatarColor: membership.user.avatarColor,
    })),
  });
}

/**
 * Adds a teammate. Real invite email delivery is out of scope for the MVP, so
 * an admin sets the starting password and shares it — the membership, roles and
 * permissions are all real.
 */
export async function POST(request: NextRequest) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { email, name, password, role } = parsed.data;
  const orgId = auth.session.org.id;

  // Only an owner can mint another owner.
  if (role === "owner" && auth.session.role !== "owner") {
    return NextResponse.json(
      { errors: { role: "Only an owner can add another owner" } },
      { status: 403 }
    );
  }

  const existing = await db.user.findUnique({
    where: { email },
    include: { memberships: { where: { orgId } } },
  });

  if (existing) {
    if (existing.memberships.length > 0) {
      return NextResponse.json(
        { errors: { email: "They're already in this workspace" } },
        { status: 409 }
      );
    }

    // Existing account elsewhere — just add them to this workspace.
    await db.membership.create({
      data: { userId: existing.id, orgId, role },
    });
    return NextResponse.json({ ok: true, existingAccount: true });
  }

  await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      avatarColor: pickColor(email),
      memberships: { create: { orgId, role } },
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

const COLORS = ["slate", "blue", "violet", "emerald", "amber", "rose"];

function pickColor(seed: string): string {
  const sum = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}
