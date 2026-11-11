import { useSyncExternalStore } from "react";

/**
 * Color theme handling. The resolved theme is written to `data-bs-theme` on <html>, which switches
 * Bootstrap and every wb- color token (see src/styles/theme.css).
 * The initial value is applied by an inline script in index.html (same storage key) to avoid a flash.
 */

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "wb-theme";
const darkQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === "light" || value === "dark" ? value : "system";
    } catch {
        return "system";
    }
}

function resolve(preference: ThemePreference): Theme {
    if (preference !== "system") return preference;
    return darkQuery?.matches ? "dark" : "light";
}

function apply() {
    document.documentElement.setAttribute("data-bs-theme", resolve(readPreference()));
    listeners.forEach(listener => listener());
}

// Follow OS changes while the user has not picked a theme explicitly
darkQuery?.addEventListener("change", () => {
    if (readPreference() === "system") apply();
});

export function setThemePreference(preference: ThemePreference) {
    try {
        if (preference === "system") localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
        // storage unavailable: theme still applies for this page view
    }
    apply();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getTheme(): Theme {
    return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
}

/**
 * Current resolved theme (`light` / `dark`), the stored preference (`system` when not chosen)
 * and its setter; re-renders when the theme changes.
 */
export function useTheme() {
    const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
    const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);
    return { theme, preference, setThemePreference };
}

apply();
