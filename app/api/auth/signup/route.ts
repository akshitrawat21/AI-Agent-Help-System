import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { pickColor, uniqueSlug } from "@/lib/tenants";
import { fieldErrors, signupSchema } from "@/lib/validation";

/** Signing up creates the user and their first workspace in one step. */
export async function POST(request: NextRequest) {
  const parsed = signupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, password, orgName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { errors: { email: "An account with this email already exists" } },
      { status: 409 }
    );
  }

  const slug = await uniqueSlug(orgName);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      avatarColor: pickColor(email),
      memberships: {
        create: {
          role: "owner",
          org: {
            create: {
              name: orgName,
              slug,
              // Defaults are good enough to start answering immediately.
              agentConfig: { create: {} },
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  await createSession(user.id, user.memberships[0].orgId);

  return NextResponse.json({ ok: true });
}

// Slug and avatar helpers live in lib/tenants so the platform console and
// self-serve signup provision identical workspaces.
