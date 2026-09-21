import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { fieldErrors, loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });

  // Same message either way, so this can't be used to enumerate accounts.
  const invalid = NextResponse.json(
    { errors: { form: "That email and password don't match" } },
    { status: 401 }
  );

  if (!user) return invalid;
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  // Without a membership there is no workspace to land in, and getSession
  // would reject the session immediately — a silent redirect loop back to
  // this page. Say so instead.
  if (user.memberships.length === 0) {
    return NextResponse.json(
      {
        errors: {
          form: "This account isn't in any workspace. Ask an admin to add you back, or create a new workspace.",
        },
      },
      { status: 403 }
    );
  }

  await createSession(user.id, user.memberships[0].orgId);

  return NextResponse.json({ ok: true });
}
