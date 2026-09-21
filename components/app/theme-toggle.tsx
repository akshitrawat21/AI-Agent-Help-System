"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

/** Segmented control, the way system settings present a three-way choice. */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is null until the provider has read the stored preference,
  // which doubles as the "mounted yet?" signal for the active segment.
  const mounted = resolvedTheme !== null;

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "flex size-7 items-center justify-center rounded-[6px] transition-colors duration-150",
              active
                ? "bg-surface text-foreground shadow-[0_1px_2px_oklch(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
