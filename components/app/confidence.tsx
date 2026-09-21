import { cn } from "@/lib/utils";

/** Bands are chosen to match the default 0.6 escalation threshold. */
function band(confidence: number) {
  if (confidence >= 0.8) return { tone: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (confidence >= 0.6) return { tone: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { tone: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
}

export function ConfidenceBar({
  confidence,
  className,
  showValue = true,
}: {
  confidence: number;
  className?: string;
  showValue?: boolean;
}) {
  const { tone, bar } = band(confidence);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="h-1 w-14 overflow-hidden rounded-full bg-border"
        role="img"
        aria-label={`Confidence ${Math.round(confidence * 100)} percent`}
      >
        <span
          className={cn("block h-full rounded-full transition-[width] duration-500", bar)}
          style={{ width: `${Math.max(3, confidence * 100)}%` }}
        />
      </span>
      {showValue && (
        <span className={cn("tabular text-[11px] font-medium", tone)}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}
