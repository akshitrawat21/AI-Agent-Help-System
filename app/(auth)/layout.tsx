import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Already signed in? There's nothing to do on these pages.
  const session = await getSession();
  if (session) redirect("/app");

  return (
    // A faint wash of the hero's sky at the top, so sign-in feels like the
    // same place as the landing page rather than a bare form.
    <div className="flex min-h-svh flex-col bg-background [background:linear-gradient(180deg,color-mix(in_oklch,var(--sky-haze)_55%,transparent)_0%,var(--background)_38%)]">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em]"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            H
          </span>
          Helpdesk AI
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-20 sm:px-8">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </main>
    </div>
  );
}
