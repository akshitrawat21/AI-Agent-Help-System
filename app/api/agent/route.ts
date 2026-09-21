import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/guard";
import { getAgentConfig } from "@/lib/agent-config";
import { agentConfigSchema, fieldErrors } from "@/lib/validation";

export async function GET() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;

  const config = await getAgentConfig(auth.session.org.id);

  // Never send the stored key back to the browser — only whether one is set.
  const { apiKey, ...safe } = config;
  return NextResponse.json({ config: { ...safe, hasApiKey: Boolean(apiKey) } });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize("admin");
  if ("response" in auth) return auth.response;

  const parsed = agentConfigSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const orgId = auth.session.org.id;
  await getAgentConfig(orgId);

  const { apiKey, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };

  // An omitted key leaves the stored one alone; an empty string clears it.
  if (apiKey !== undefined) data.apiKey = apiKey === "" ? null : apiKey;

  const config = await db.agentConfig.update({ where: { orgId }, data });
  const { apiKey: stored, ...safe } = config;

  return NextResponse.json({
    config: { ...safe, hasApiKey: Boolean(stored) },
  });
}
