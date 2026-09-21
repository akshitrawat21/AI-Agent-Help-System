"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "helpdesk-theme";

type ThemeContextValue = {
  theme: Theme;
  /** What `system` actually resolved to. Null until mounted. */
  resolvedTheme: ResolvedTheme | null;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: null,
  setTheme: () => {},
});

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // Keeps form controls and scrollbars in step with the page.
  root.style.colorScheme = resolved;
}

/**
 * Theme state, persistence and system-preference tracking.
 *
 * The first paint is handled by the blocking script in the root layout, not
 * here — a client component can't set the class before the browser paints, and
 * rendering a <script> from one triggers a React 19 warning besides. This
 * provider owns everything after that: the stored preference, live changes to
 * the OS setting, and the toggle.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The server can't know the stored preference, so both sides render with
  // "system" and the real value lands on mount. No markup depends on it.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | null>(null);

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    } catch {
      // Private mode or blocked storage — fall back to following the system.
    }

    const initial: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    setThemeState(initial);
    const resolved = initial === "system" ? systemTheme() : initial;
    setResolvedTheme(resolved);
    apply(resolved);
  }, []);

  // Follow the OS setting while the choice is "system".
  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      const resolved = systemTheme();
      setResolvedTheme(resolved);
      apply(resolved);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  // Keep other tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || !event.newValue) return;
      const next = event.newValue as Theme;
      if (next !== "light" && next !== "dark" && next !== "system") return;

      setThemeState(next);
      const resolved = next === "system" ? systemTheme() : next;
      setResolvedTheme(resolved);
      apply(resolved);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Preference just won't persist; the current session still switches.
    }

    const resolved = next === "system" ? systemTheme() : next;
    setResolvedTheme(resolved);
    apply(resolved);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Runs before first paint to set the theme class, so a dark-mode visitor never
 * sees a white flash. Injected from the root layout, which is a server
 * component, so React never treats it as a client-rendered <script>.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});var d=s==="dark"||((!s||s==="system")&&window.matchMedia("${DARK_QUERY}").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
