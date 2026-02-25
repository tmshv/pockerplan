import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "pockerplan_theme";

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "system";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  if (resolved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

let currentTheme: Theme = getStoredTheme();
let currentResolved: ResolvedTheme = resolveTheme(currentTheme);
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentTheme;
}

function getResolvedSnapshot() {
  return currentResolved;
}

// Listen to system theme changes
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", () => {
      if (currentTheme === "system") {
        currentResolved = getSystemTheme();
        applyTheme(currentResolved);
        notify();
      }
    });
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  const resolvedTheme = useSyncExternalStore(subscribe, getResolvedSnapshot);

  useEffect(() => {
    applyTheme(currentResolved);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    currentTheme = newTheme;
    currentResolved = resolveTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(currentResolved);
    notify();
  }, []);

  return { theme, setTheme, resolvedTheme };
}
