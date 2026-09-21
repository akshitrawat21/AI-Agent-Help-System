import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-[13px] text-foreground shadow-[inset_0_1px_1px_oklch(0_0_0/0.02)] transition-[border-color,box-shadow] outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/16",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/16",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:border-0 file:bg-transparent file:text-[13px] file:font-medium",
        className
      )}
      {...props}
    />
  );
}

export { Input };
