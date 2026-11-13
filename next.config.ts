import type { NextConfig } from "next";

// The API that stores the user photos (Next loads .env before this file runs).
const api = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api");

const nextConfig: NextConfig = {
  // The defaults `create-next-app@latest` (16.4) writes. Cache Components: the root
  // layout reads the theme and session cookies, so it opts out of instant validation
  // (`instant = false` in app/layout.tsx); every dashboard page is a client screen
  // on TanStack Query. See docs/dashboard-patterns.md, "Cache Components".
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind 4 through Turbopack's loader, as the 16.4 skeleton does (no postcss.config).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  compiler: {
    // Console logs stay in development, never in a production build.
    removeConsole: process.env.NODE_ENV === "production",
  },

  // next/image sizes the photos the API stores (user photos; field photos in Phase 2).
  images: {
    remotePatterns: [
      {
        protocol: api.protocol === "https:" ? "https" : "http",
        hostname: api.hostname,
        port: api.port,
        pathname: "/storage/**",
        search: "",
      },
      // Google avatars on accounts signed in with Google.
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
    formats: ["image/webp"],
    qualities: [75],
    // Fewer widths than the defaults: each one is another copy per photo in .next/cache/images.
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [96, 160, 256, 384],
    // A stored photo never changes under its name (a new upload gets a new file), so cache long.
    minimumCacheTTL: 2678400, // 31 days
    maximumResponseBody: 21_000_000,
    maximumRedirects: 0,
    // In development the API is on a private IP (127.0.0.1), which the optimizer refuses.
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
