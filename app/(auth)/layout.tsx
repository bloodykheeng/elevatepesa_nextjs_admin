import type { Metadata } from "next";

// The root layout already supplies the title template; sign-in and reset pages
// only need to stay out of search results. The theme switch is in AuthShell.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
