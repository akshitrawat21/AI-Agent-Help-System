import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-sunken">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[14px] font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
