// Theme switching — dark is the brand default; "light" persists and is
// re-applied before first paint by the boot script in app/layout.tsx.
// The map's tile layer listens for "aidpulse:theme-change" to swap basemaps.

export type ThemeMode = "dark" | "light";

const THEME_KEY = "aidpulse:theme";

export function currentTheme(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    window.localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("aidpulse:theme-change", { detail: mode }));
}
