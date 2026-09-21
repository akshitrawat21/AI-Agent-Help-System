import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Per-tenant frame policy for the public assistant page.
 *
 * A tenant that lists the websites allowed to embed its assistant gets a
 * `frame-ancestors` directive on /w/[slug], so a browser refuses to render the
 * widget inside anyone else's iframe. `frame-ancestors` only works as a
 * response header — a meta tag is ignored — and pages can't set response
 * headers, which is why this lives in the proxy. Proxy runs on the Node.js
 * runtime, so the lookup is a single indexed read.
 *
 * An empty allowlist (the default while evaluating) sets no header, and the
 * page stays embeddable anywhere. Origin checks on the chat API back this up
 * for clients that ignore CSP.
 */
export async function proxy(request: NextRequest) {
  const [, , slug] = request.nextUrl.pathname.split("/");
  if (!slug) return NextResponse.next();

  let allowedOrigins = "";
  try {
    const org = await db.organization.findUnique({
      where: { slug },
      select: { allowedOrigins: true },
    });
    allowedOrigins = org?.allowedOrigins ?? "";
  } catch {
    // If the lookup fails the page will surface the error itself; don't
    // block it here with a policy we can't compute.
    return NextResponse.next();
  }

  const ancestors = allowedOrigins
    .split(/\r?\n|,/)
    .map((line) => line.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (ancestors.length === 0) return NextResponse.next();

  const response = NextResponse.next();
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors 'self' ${ancestors.join(" ")}`
  );
  return response;
}

export const config = {
  matcher: ["/w/:slug*"],
};
