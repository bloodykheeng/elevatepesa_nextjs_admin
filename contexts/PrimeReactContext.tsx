"use client";
import { useEffect, useContext } from "react";

import { PrimeReactProvider, PrimeReactContext as PrimeReactAPIContext } from "primereact/api";
import { useTheme } from "./ThemeContext";

function ThemeSync() {
  const { theme } = useTheme();
  const { changeTheme } = useContext(PrimeReactAPIContext);

  useEffect(() => {
    if (!theme || !changeTheme) return; // Avoid SSR issues

    const linkId = "theme-link";
    const newTheme = theme === "dark" ? "lara-dark-pesa" : "lara-light-pesa";
    const currentTheme =
      newTheme === "lara-dark-pesa" ? "lara-light-pesa" : "lara-dark-pesa";

    changeTheme(currentTheme, newTheme, linkId, () => {
      const existingLinks = document.querySelectorAll(`link[id="${linkId}"]`);
      if (existingLinks.length > 1) {
        document.head.removeChild(existingLinks[0]); // Remove old theme link
      }
    });
  }, [theme, changeTheme]);

  return null;
}

// PrimeReactAPIContext alias above avoids conflict with this component name
export default function PrimeReactContext({
  children,
}: {
  children: React.ReactNode;
}) {
  // NO `pt: Tailwind`. That passthrough preset is built for `unstyled: true`, and it
  // replaces a theme rather than decorating one. Layered on top of a styled lara
  // theme it stamped literal utility classes onto every part, e.g. the Dropdown's
  // items-wrapper got `bg-white … dark:bg-gray-900`. Those classes live in
  // node_modules, which Tailwind 4 does not scan, so `.bg-white` was emitted (our
  // own source uses it) while `.dark\:bg-gray-900` never was, so every portaled
  // panel painted itself white in dark mode and no override could reach it,
  // because the white was on the wrapper *inside* .p-dropdown-panel. It also
  // capped inputs at `md:w-56`, which is what shortened the password field.
  // Dark mode is handled by ThemeSync swapping to lara-dark-pesa plus the token
  // overrides in app/primereact-theme.css. Do not add the preset back.
  return (
    <PrimeReactProvider value={{ unstyled: false }}>
      <ThemeSync />
      {children}
    </PrimeReactProvider>
  );
}

// The two themes in public/themes are generated from Lara Indigo recoloured to Elevate Pesa green:
// `node scripts/build-prime-theme.mjs` (again after any primereact upgrade).
