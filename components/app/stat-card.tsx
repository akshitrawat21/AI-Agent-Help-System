import { cn } from "@/lib/utils";

/**
 * A metric tile. The number leads at a size nothing else on the page uses, the
 * label sits above it small and quiet, and any delta goes underneath — so a row
 * of these scans as numbers first.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_oklch(0_0_0/0.04)]",
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("tabular mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]", tones[tone])}>
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
