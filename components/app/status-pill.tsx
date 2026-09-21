import { cn } from "@/lib/utils";

/**
 * Status is carried by a small tinted dot plus a word — legible at a glance in
 * a dense list without the colour shouting.
 */
const STYLES: Record<string, { dot: string; label: string }> = {
  active: { dot: "bg-primary", label: "Active" },
  waiting: { dot: "bg-amber-500", label: "Needs a human" },
  live: { dot: "bg-emerald-500", label: "Live with a teammate" },
  resolved: { dot: "bg-emerald-500", label: "Resolved" },
  missed: { dot: "bg-red-500", label: "Missed" },
  pending: { dot: "bg-amber-500", label: "Waiting" },
  answered: { dot: "bg-emerald-500", label: "Answered" },
};

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STYLES[status] ?? {
    dot: "bg-muted-foreground",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] text-muted-foreground",
        className
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
