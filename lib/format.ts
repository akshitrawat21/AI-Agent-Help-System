import { formatDistanceToNowStrict } from "date-fns";

/**
 * Dates are formatted with an explicit locale, never the ambient one.
 *
 * `toLocaleDateString(undefined, …)` resolves against the *host* locale, which
 * is Node's on the server and the browser's on the client. Those disagree
 * ("10 Sept" vs "Sep 10"), and since these helpers run inside SSR'd client
 * components the difference surfaces as a hydration mismatch and a visible
 * flicker on load. Pinning the locale makes the output deterministic.
 */
const LOCALE = "en-US";

export function relativeTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const seconds = (Date.now() - value.getTime()) / 1000;
  if (seconds < 45) return "just now";
  return `${formatDistanceToNowStrict(value)} ago`;
}

export function clockTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
  });
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Renders the remaining time on an escalation's SLA, or how late it is. */
export function countdown(dueAt: Date | string): {
  label: string;
  overdue: boolean;
} {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const remaining = due.getTime() - Date.now();

  if (remaining <= 0) {
    return { label: `${formatDistanceToNowStrict(due)} overdue`, overdue: true };
  }

  const minutes = Math.floor(remaining / 60000);
  if (minutes < 1) return { label: "under a minute left", overdue: false };
  if (minutes < 60) return { label: `${minutes}m left`, overdue: false };

  const hours = Math.floor(minutes / 60);
  return { label: `${hours}h ${minutes % 60}m left`, overdue: false };
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic avatar tint from a stored colour name. */
export const AVATAR_CLASSES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
};

export function avatarClass(color: string): string {
  return AVATAR_CLASSES[color] ?? AVATAR_CLASSES.slate;
}

/**
 * `YYYY-MM-DD` in **local** time, for use as a chart bucket key.
 *
 * `toISOString().slice(0, 10)` looks equivalent but is UTC, so on any host not
 * at UTC it disagrees with a range built from local midnight: the buckets end
 * up shifted a day and today's rows fall outside them entirely. Keys and rows
 * must be derived the same way, and local is the one that matches what a
 * person means by "today".
 */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
