"use client";

import { createContext, useState, useLayoutEffect, useContext } from "react";
import Cookies from "js-cookie";

type Theme = "light" | "dark";
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Internal React context object: named ThemeCtx to avoid conflict with the exported component below
const ThemeCtx = createContext<ThemeContextType | undefined>(undefined);

/** Applies a theme to the document and saves it (the same cookie the pre-paint script reads). */
function applyTheme(themeValue: Theme) {
  const html = document.documentElement;
  const isDark = themeValue === "dark";

  html.classList.toggle("dark", isDark);
  html.classList.toggle("light", !isDark);
  html.style.colorScheme = themeValue;
  html.setAttribute("data-theme", themeValue);
  Cookies.set("theme", themeValue, { expires: 365, sameSite: "Lax" });
}

/**
 * The light/dark theme. The first paint is already right: the inline script in
 * app/layout.tsx applies the saved theme while the HTML is parsed. This keeps React's
 * state in step with it and owns the toggle. Nothing renders from `theme` directly
 * (ThemeToggle switches its icon with `dark:` classes), so reading the cookie in the lazy
 * initializer cannot cause a hydration mismatch.
 */
export function ThemeContext({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined" ? "light" : Cookies.get("theme") === "dark" ? "dark" : "light",
  );

  // Before paint, not after: in development Strict Mode's remount resets <html>'s
  // attributes, and the script does not run again (Next's guide, "Re-applying attributes
  // in development"). A no-op in production.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme: handleSetTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeCtx);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeContext");
  }
  return context;
}
