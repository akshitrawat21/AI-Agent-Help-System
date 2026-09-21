import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-surface px-3 py-2 text-[13px] leading-relaxed text-foreground shadow-[inset_0_1px_1px_oklch(0_0_0/0.02)] transition-[border-color,box-shadow] outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/16",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/16",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
