"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  ChevronsUpDown,
  Code2,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarBadge } from "@/components/app/avatar-badge";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLiveEvents } from "@/hooks/use-live-events";
import { cn } from "@/lib/utils";
import type { SessionContext } from "@/lib/auth/session";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/escalations", label: "Escalations", icon: LifeBuoy, badge: true },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/assistant", label: "Assistant", icon: Sparkles },
  { href: "/app/install", label: "Install", icon: Code2 },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  session,
  pendingCount,
  children,
}: {
  session: SessionContext;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(pendingCount);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keep the badge honest when the server sends a fresh count on navigation.
  useEffect(() => setPending(pendingCount), [pendingCount]);

  // Close the drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  // Presence heartbeat: while a dashboard is open, this teammate counts as
  // online, and the public widget can say so honestly.
  useEffect(() => {
    const ping = () => {
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };
    ping();
    const timer = setInterval(ping, 60_000);
    return () => clearInterval(timer);
  }, []);

  useLiveEvents((event) => {
    if (event.type === "escalation.created") {
      setPending((count) => count + 1);
      toast("A question needs a human", {
        description: "The assistant wasn't confident enough to answer.",
        action: {
          label: "Open queue",
          onClick: () => router.push("/app/escalations"),
        },
      });
    }

    if (event.type === "escalation.answered" || event.type === "escalation.missed") {
      setPending((count) => Math.max(0, count - 1));
    }

    // Server components own the data, so let Next refetch them.
    router.refresh();
  });

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const switchOrg = async (orgId: string) => {
    await fetch("/api/auth/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    router.push("/app");
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-3">
      {/* Workspace switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[12px] font-semibold text-primary-foreground">
              {session.org.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">
                {session.org.name}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {session.organizations.length > 1
                  ? `${session.organizations.length} workspaces`
                  : "Workspace"}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {session.organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => org.id !== session.org.id && switchOrg(org.id)}
              className="gap-2"
            >
              <span className="flex size-5 items-center justify-center rounded bg-secondary text-[10px] font-semibold">
                {org.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === session.org.id && (
                <span className="size-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="mt-2 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors duration-150",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground/80"
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {badge && pending > 0 && (
                // Keyed on the count so a change pops the badge afresh.
                <span
                  key={pending}
                  className="animate-pop tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                >
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        {session.user.isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors duration-150",
              pathname.startsWith("/admin")
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Building2
              className={cn(
                "size-4 shrink-0",
                pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground/80"
              )}
            />
            <span className="flex-1 truncate">Platform</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary">
              Admin
            </span>
          </Link>
        )}

        <Link
          href={`/w/${session.org.slug}`}
          target="_blank"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-2.5 py-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="pulse-dot size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="flex-1 truncate">View live assistant</span>
        </Link>

        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent"
            >
              <AvatarBadge
                name={session.user.name}
                color={session.user.avatarColor}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium">
                  {session.user.name}
                </span>
                <span className="block truncate text-[11px] capitalize text-muted-foreground">
                  {session.role}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-[13px] font-medium">
                {session.user.name}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {session.user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2">
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh bg-surface-sunken">
      {/* Desktop sidebar: fixed, hairline-separated, never scrolls with content */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-background lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/25 animate-fade"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-border bg-background animate-rise">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </Button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <div className="glass sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">
            {session.org.name}
          </span>
          {pending > 0 && (
            <span
              key={pending}
              className="animate-pop tabular ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              {pending}
            </span>
          )}
        </div>

        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
