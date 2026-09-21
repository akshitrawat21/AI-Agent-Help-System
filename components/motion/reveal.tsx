"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Rises its content in the first time it scrolls into view.
 *
 * Renders in place with no layout shift — only opacity and a few pixels of
 * travel change (see `.reveal` in globals.css). With `stagger`, the direct
 * children enter one after another instead of the wrapper as a whole. When
 * IntersectionObserver is missing, everything is simply visible.
 */
export function Reveal({
  as = "div",
  children,
  className,
  delay = 0,
  stagger = false,
}: {
  as?: "div" | "ol" | "ul" | "section";
  children: ReactNode;
  className?: string;
  /** Milliseconds to hold before rising, for a second column that follows the first. */
  delay?: number;
  /** Animate the direct children in sequence rather than the wrapper. */
  stagger?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          node.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as ElementType;
  const style: CSSProperties | undefined = delay
    ? { animationDelay: `${delay}ms` }
    : undefined;

  return (
    <Tag
      ref={ref}
      className={cn(stagger ? "reveal-group" : "reveal", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
