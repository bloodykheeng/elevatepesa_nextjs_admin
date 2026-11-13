import ThemeToggle from "@/components/common/ThemeToggle";
import { LogoMark } from "@/components/brand/Logo";

/**
 * The sign-in, forgot-password and reset-password pages: one card in the middle of a calm page
 * with a soft green glow, the wordmark top left, the theme switch top right. One screen tall; it
 * scrolls only on a screen too small for the card.
 */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-(--cream) text-(--ink)">
      <div aria-hidden className="pointer-events-none absolute -left-72 -top-72 h-[48rem] w-[48rem] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22),rgba(16,185,129,0)_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-96 -right-72 h-[56rem] w-[56rem] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.14),rgba(245,158,11,0)_70%)]" />

      <header className="relative z-20 flex shrink-0 items-center justify-between px-6 pt-5 sm:px-10">
        <p className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <LogoMark className="h-8 w-8" /> Elevate Pesa
        </p>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[26rem] rounded-3xl border border-(--border-color) bg-(--bg-card) p-7 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] sm:p-9">
          <div className="mb-6 flex flex-col items-center text-center">
            <LogoMark className="h-14 w-14" />
            <h1 className="mt-4 text-xl font-bold text-(--ink)">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-(--text-muted)">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>

      <footer className="relative z-10 pb-5 text-center text-xs text-(--text-muted)">Elevate Pesa · Admin dashboard</footer>
    </div>
  );
}
