import { avatarClass, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AvatarBadge({
  name,
  color = "slate",
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-6 text-[10px]",
    md: "size-8 text-[11px]",
    lg: "size-10 text-[13px]",
  };

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        avatarClass(color),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
