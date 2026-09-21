import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // The shared press feel: a barely-there scale on tap, quick easing, and a
  // focus ring that only appears for keyboard users.
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out select-none active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Lit, not flat: a top highlight and a coloured shadow (see .glossy).
        default: "glossy bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent border border-border",
        outline:
          "border border-border bg-surface text-foreground shadow-[0_1px_2px_oklch(0_0_0/0.04)] hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        subtle: "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 gap-1.5 rounded-md px-2.5 text-[12.5px]",
        lg: "h-11 rounded-xl px-5 text-[14px]",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
