import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeContext } from "@/contexts/ThemeContext";
import PrimeReactCtx from "@/contexts/PrimeReactContext";
import { PrimeReactToastContext } from "@/contexts/PrimeReactToastContext";
import TanstackContext from "@/contexts/TanstackContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AuthContext } from "@/contexts/AuthContext";
import NextJsProgressBar from "@/utils/NextJsProgressBar";

export const metadata: Metadata = {
  applicationName: "Elevate Pesa Admin",
  title: {
    template: "%s | Elevate Pesa Admin",
    default: "Elevate Pesa Admin",
  },
  description: "Orders, payments, products and customers for Elevate Pesa.",
  icons: { icon: "/favicon.ico", apple: "/brand/mark.png" },
  // A staff system: nothing here belongs in a search engine.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

/**
 * The theme, applied before the first paint (Next's "Preventing flash before hydration"):
 * the saved `theme` cookie sets the `dark` class and `color-scheme` while the HTML is still
 * being parsed. Read here rather than with `cookies()`, which under Cache Components would
 * make this layout, and every segment under it, block on the request. ThemeContext keeps
 * it in step after hydration.
 *
 * The PrimeReact theme `<link id="theme-link">` is made by this script, never rendered by
 * React: React 19 hydrates a stylesheet link only if its href is unchanged, so a rendered
 * light link that the script turned dark failed hydration on every dark-mode load. React
 * leaves head tags it did not render alone. It goes where the script stands, AFTER the
 * stylesheets Next hoists to the top of <head>: the theme's rules sit in `@layer
 * primereact`, and layers rank by the order they are first declared, so ahead of
 * Tailwind's layers its rules lost to Tailwind's reset (tabs with no padding). Our own
 * overrides (primereact-theme.css) are unlayered and win either way. `blocking="render"`
 * holds the first paint for it. ThemeSync swaps its href when the theme flips.
 */
const THEME_SCRIPT = `(function(){var t="light";try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);if(m&&decodeURIComponent(m[1])==="dark")t="dark"}catch(e){}var d=t==="dark";var h=document.documentElement;h.classList.toggle("dark",d);h.classList.toggle("light",!d);h.style.colorScheme=t;h.setAttribute("data-theme",t);if(!document.getElementById("theme-link")){var l=document.createElement("link");l.id="theme-link";l.rel="stylesheet";l.setAttribute("blocking","render");l.href="/themes/lara-"+t+"-pesa/theme.css";var s=document.currentScript;if(s&&s.parentNode)s.parentNode.insertBefore(l,s);else document.head.appendChild(l)}})()`;

/**
 * Static: no request data is read here, so the layout is part of the prerendered shell.
 * Who is signed in is read on the client (AuthContext), and the theme by the script above.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The script changes <html>'s class and style before React hydrates.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>

      {/* Browser extensions write attributes on <body> before React hydrates (Scrnli adds location="localhost"):
          ignored on this tag only, everything inside is still checked. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextJsProgressBar />
        <ThemeContext>
          <PrimeReactCtx>
            <PrimeReactToastContext>
              <TanstackContext>
                <AuthContext>
                  <SidebarProvider>{children}</SidebarProvider>
                </AuthContext>
              </TanstackContext>
            </PrimeReactToastContext>
          </PrimeReactCtx>
        </ThemeContext>
      </body>
    </html>
  );
}
