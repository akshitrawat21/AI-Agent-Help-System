import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession, type SessionContext } from "@/lib/auth/session";
import { ROLE_RANK, type Role } from "@/lib/constants";

/** For server components: bounces to /login when unauthenticated. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * For route handlers. Returns either the session or a 401 response, so callers
 * can do: `const auth = await authorize(); if ("response" in auth) return auth.response;`
 */
export async function authorize(minRole: Role = "agent"): Promise<
  { session: SessionContext } | { response: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }

  const rank = ROLE_RANK[session.role as Role] ?? 0;
  if (rank < ROLE_RANK[minRole]) {
    return {
      response: NextResponse.json(
        { error: "You don't have permission to do that" },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export function can(role: string, minRole: Role): boolean {
  return (ROLE_RANK[role as Role] ?? 0) >= ROLE_RANK[minRole];
}

/**
 * Platform-operator gate. Deliberately separate from `authorize()`: org roles
 * say what you can do *inside* a tenant, this says whether you stand above
 * all of them. A 404 rather than 403 for non-admins, so the console's
 * existence isn't advertised to tenant users who guess the URL.
 */
export async function authorizeSuperAdmin(): Promise<
  { session: SessionContext } | { response: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  if (!session.user.isSuperAdmin) {
    return {
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { session };
}

/** For server components under /admin. */
export async function requireSuperAdmin(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isSuperAdmin) redirect("/app");
  return session;
}
