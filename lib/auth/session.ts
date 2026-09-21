import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "helpdesk_session";
const SESSION_DAYS = 30;

function expiryDate() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string, orgId: string | null) {
  const token = randomBytes(32).toString("hex");

  await db.session.create({
    data: { token, userId, orgId, expiresAt: expiryDate() },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiryDate(),
  });

  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}

/** Points an existing session at a different organization. */
export async function switchSessionOrg(token: string, orgId: string) {
  await db.session.update({ where: { token }, data: { orgId } });
}

export type SessionContext = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    /** Platform operator — sees and manages every tenant. */
    isSuperAdmin: boolean;
  };
  org: { id: string; name: string; slug: string };
  role: string;
  /** Every org this user can switch into. */
  organizations: { id: string; name: string; slug: string; role: string }[];
};

/**
 * Resolves the cookie into a user + active organization, or null.
 * Falls back to the user's first membership when the session has no org
 * pinned or the pinned org is no longer accessible.
 */
export async function getSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          memberships: {
            include: { org: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.session.deleteMany({ where: { token } });
    return null;
  }

  const memberships = session.user.memberships;
  if (memberships.length === 0) return null;

  const active =
    memberships.find((m) => m.orgId === session.orgId) ?? memberships[0];

  // Repair a session pointing at an org the user has since left.
  if (active.orgId !== session.orgId) {
    await db.session.update({
      where: { token },
      data: { orgId: active.orgId },
    });
  }

  return {
    token,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      avatarColor: session.user.avatarColor,
      isSuperAdmin: session.user.isSuperAdmin,
    },
    org: {
      id: active.org.id,
      name: active.org.name,
      slug: active.org.slug,
    },
    role: active.role,
    organizations: memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      role: m.role,
    })),
  };
}
