"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { useAuth } from "@/contexts/AuthContext";
import { mayOpen, pageRequirement } from "@/lib/pageAccess";
import { menuGroups } from "@/lib/menuItems";
import { plural } from "@/lib/plural";
import { renderIcon } from "@/lib/iconRegistry";
import { MANUAL, ROLE_BRIEFS, topicHaystack, type ManualChapter, type ManualModule, type ManualTopic } from "./manual";

/**
 * The user manual, laid out as current documentation sites are (Stripe's, Mintlify's, GitBook's; Kong's and Block's
 * docs layouts, docs/user-manual.md): one surface in three columns, a plain side menu of chapters and modules with
 * the search on top, the page in a reading column, and "On this page" on the right, sticky, marking the topic being
 * read. One module per page with its topics as headed sections (not closed accordions), callouts for what is good to
 * know and what to avoid, previous and next at the foot. The start page draws the funnel, marks the reader's role
 * and lays every module out as cards, across the whole width (the user, 30 Oct 2026: the indigo banner and the
 * boxed menu "look ugly", and the right column stood empty). The module is in the URL (`?m=pipeline`), so a link
 * can open the manual at the right page.
 *
 * Narrowed to what the reader does (SDS's design): `reaches()` asks the menu (lib/pageAccess, the
 * rule the sidebar and PageAccessGuard use) and `can()`, so the manual cannot claim a role reaches a
 * page it does not. The rest is one switch away and marked.
 */

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** The words searched for, marked where they appear. */
function Marked({ text, search }: { text: string; search: string }) {
  if (!search) return <>{text}</>;
  const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === search ? (
          <mark key={i} className="rounded bg-[#FBD405]/60 px-0.5 text-inherit dark:bg-[#FBD405]/30">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

/** A few words around the first match, for a search result. */
function snippet(topic: ManualTopic, search: string): string {
  const text = [topic.body, ...(topic.steps ?? []), ...(topic.notes ?? []), topic.warning ?? ""].join(" ");
  const at = text.toLowerCase().indexOf(search);
  if (at < 0) return topic.body.length > 160 ? `${topic.body.slice(0, 160)}…` : topic.body;
  const start = Math.max(0, at - 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, at + search.length + 100)}…`;
}

export default function UserManual() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [showEverything, setShowEverything] = useState(false);
  const role = user?.role ?? null;
  const search = query.trim().toLowerCase();

  const reaches = useMemo(
    () => (module: ManualModule) => {
      if (!module.route) return true;
      return mayOpen(pageRequirement(module.route, menuGroups), role);
    },
    [role],
  );

  const chapters = useMemo(
    () => MANUAL.map((c) => ({ ...c, modules: c.modules.filter((m) => showEverything || reaches(m)) })).filter((c) => c.modules.length > 0),
    [reaches, showEverything],
  );
  const ordered = chapters.flatMap((c) => c.modules.map((m) => ({ chapter: c, module: m })));
  const current = ordered.find((x) => x.module.id === params.get("m")) ?? null;
  const yours = MANUAL.reduce((n, c) => n + c.modules.filter(reaches).length, 0);
  const everything = MANUAL.reduce((n, c) => n + c.modules.length, 0);

  const open = (moduleId: string | null, topic?: string) => {
    const next = new URLSearchParams(params.toString());
    if (moduleId) next.set("m", moduleId);
    else next.delete("m");
    setQuery("");
    router.push(`${pathname}${next.size ? `?${next}` : ""}${topic ? `#${topic}` : ""}`, { scroll: false });
    if (topic) setTimeout(() => document.getElementById(topic)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    else document.getElementById("manual-top")?.scrollIntoView({ block: "start" });
  };

  const results = useMemo(() => {
    if (!search) return [];
    return chapters.flatMap((c) =>
      c.modules.flatMap((m) => {
        const moduleHit = m.title.toLowerCase().includes(search) || m.summary.toLowerCase().includes(search) || (m.keywords ?? []).some((w) => w.includes(search));
        return m.topics.filter((t) => moduleHit || topicHaystack(t).includes(search)).map((t) => ({ chapter: c, module: m, topic: t }));
      }),
    );
  }, [chapters, search]);

  return (
    <div id="manual-top" className="grid scroll-mt-4 rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm) lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
      {/* The side menu: the search, then chapters and their modules, on the surface itself (no box in a box). */}
      <aside className="border-b border-(--border-color) lg:border-b-0 lg:border-r">
        <div className="max-h-80 overflow-y-auto p-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)]">
          {/* `pl-9!` and `pr-8!`: the unlayered PrimeReact theme outranks Tailwind's layered padding. */}
          <div className="relative">
            <InputText value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the manual" className="w-full pl-9! pr-8! text-sm" aria-label="Search the manual" />
            <span aria-hidden className="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--text-muted)" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="pi pi-times absolute right-3 top-1/2 -translate-y-1/2 text-sm text-(--text-muted) hover:text-(--text-primary)" />
            )}
          </div>

          {role && (
            <p className="m-0 mt-3 px-1 text-xs text-(--text-muted)">
              {showEverything ? "Every module: a dot marks those outside your role" : <>What a <span className="font-medium text-(--text-secondary)">{role}</span> does</>}
            </p>
          )}

          <nav aria-label="Manual" className="mt-3">
            <button
              type="button"
              onClick={() => open(null)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${!current && !search ? "bg-(--brand-light) font-semibold text-(--brand-ink)" : "text-(--text-secondary) hover:bg-(--sidebar-hover-bg) hover:text-(--text-primary)"}`}
            >
              <i className="pi pi-home text-sm" aria-hidden /> Start here
            </button>
            {chapters.map((c) => (
              <div key={c.id} className="mt-4">
                <p className="m-0 px-2.5 pb-1 text-xs font-semibold text-(--text-primary)">{c.title}</p>
                <ul className="m-0 ml-2.5 list-none border-l border-(--border-color) p-0">
                  {c.modules.map((m) => {
                    const active = current?.module.id === m.id && !search;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => open(m.id)}
                          aria-current={active ? "page" : undefined}
                          className={`-ml-px flex w-full items-center gap-2 border-l-2 py-1.5 pl-3 pr-2 text-left text-sm ${active ? "border-(--brand-ink) font-semibold text-(--brand-ink)" : "border-transparent text-(--text-secondary) hover:border-(--text-muted) hover:text-(--text-primary)"}`}
                        >
                          <span className="min-w-0 flex-1 truncate">{m.title}</span>
                          {!reaches(m) && <span className="size-1.5 shrink-0 rounded-full bg-(--text-muted)" title="Not part of your role" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {yours < everything && (
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 border-t border-(--border-color) px-1 pt-3">
              <InputSwitch checked={showEverything} onChange={(e) => setShowEverything(!!e.value)} aria-label="Show every module" />
              <span className="text-xs text-(--text-secondary)">Show every module ({everything - yours} more)</span>
            </label>
          )}
        </div>
      </aside>

      {/* An article, not a second <main>: the dashboard shell already has the one main. The start page and the
          search take the right column too: only a module's page has an "On this page". */}
      <article className={`min-w-0 px-5 py-6 sm:px-8 sm:py-8 ${!search && current ? "" : "xl:col-span-2"}`}>
        {search ? (
          <SearchResults query={query.trim()} search={search} results={results} canWiden={!showEverything && yours < everything} onOpen={open} />
        ) : current ? (
          <Article chapter={current.chapter} module={current.module} outside={!reaches(current.module)} ordered={ordered} onOpen={open} />
        ) : (
          <Home role={role} chapters={chapters} reaches={reaches} onOpen={open} />
        )}
      </article>

      {!search && current && <OnThisPage key={current.module.id} topics={current.module.topics} onOpen={(t) => open(current.module.id, t)} />}
    </div>
  );
}

/** The funnel, drawn: what the whole system is about, in four steps. */
const FUNNEL = [
  { icon: "pi-user-plus", title: "Prospect", who: "Sales agent", text: "A name, a phone number and where they were met, saved on a route." },
  { icon: "pi-star", title: "Lead", who: "Sales agent", text: "They want a loan: their NIN, the amount and where they live." },
  { icon: "pi-id-card", title: "KYC completed", who: "Relationship officer", text: "Visited within 50 m of the lead's place, KYC filled in on the visit." },
  { icon: "pi-wallet", title: "Customer", who: "Approvers", text: "The loan application approved and the money paid out." },
];

/** The start page: the funnel, the reader's role, then every module as a card to jump to. */
function Home({ role, chapters, reaches, onOpen }: { role: string | null; chapters: ManualChapter[]; reaches: (m: ManualModule) => boolean; onOpen: (m: string) => void }) {
  const mine = ROLE_BRIEFS.find((r) => r.role === role);
  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="m-0 text-sm font-semibold text-(--brand-ink)">Start here</p>
        <h2 className="m-0 mt-1 text-2xl font-bold tracking-tight text-(--text-primary) sm:text-3xl">How the Elevate Pesa dashboard works</h2>
        <p className="m-0 mt-3 text-base leading-relaxed text-(--text-secondary)">
          Customers shop in the Elevate Pesa app: they order gas, water and electronics (cash on delivery or pay later), book package deliveries and pay over time. Here staff follow up orders and deliveries, record payments, keep the catalogue and the app content up to date, and message customers. Pick a page in the menu, or search.
        </p>
      </header>

      <ol aria-label="From a prospect to a client" className="mt-0 grid list-none gap-3 p-0 sm:grid-cols-2 2xl:grid-cols-4">
        {FUNNEL.map((f, i) => (
          <li key={f.title} className="relative rounded-xl border border-(--border-color) p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-(--brand-light) text-(--brand-ink)" aria-hidden>
                <i className={`pi ${f.icon} text-sm`} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-(--text-muted)">Step {i + 1} · {f.who}</span>
                <span className="block text-sm font-semibold text-(--text-primary)">{f.title}</span>
              </span>
            </div>
            <p className="m-0 mt-2.5 text-xs leading-relaxed text-(--text-secondary)">{f.text}</p>
            {i < FUNNEL.length - 1 && (
              <i aria-hidden className="pi pi-angle-right absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-(--border-color) bg-(--bg-card) text-xs text-(--text-muted) 2xl:flex" />
            )}
          </li>
        ))}
      </ol>

      <section aria-labelledby="roles-h">
        <h3 id="roles-h" className="m-0 text-lg font-semibold text-(--text-primary)">Who does what</h3>
        <p className="m-0 mt-1 text-sm text-(--text-muted)">Six roles, one per person. The menu shows the pages yours uses.</p>
        {mine && (
          <div className="mt-4 rounded-xl border-l-4 border-(--brand) bg-(--brand-light) px-4 py-3">
            <p className="m-0 text-sm font-semibold text-(--brand-ink)">You are a {mine.role}</p>
            <p className="m-0 mt-0.5 text-sm leading-relaxed text-(--text-secondary)">{mine.does}</p>
          </div>
        )}
        <dl className="m-0 mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {ROLE_BRIEFS.filter((r) => r !== mine).map((r) => (
            <div key={r.role} className="min-w-0">
              <dt className="text-sm font-medium text-(--text-primary)">{r.role}</dt>
              <dd className="m-0 mt-0.5 text-sm leading-relaxed text-(--text-muted)">{r.does}</dd>
            </div>
          ))}
        </dl>
      </section>

      {chapters.map((c) => (
        <section key={c.id} aria-labelledby={`chapter-${c.id}`}>
          <h3 id={`chapter-${c.id}`} className="m-0 text-lg font-semibold text-(--text-primary)">{c.title}</h3>
          <p className="m-0 mt-1 text-sm text-(--text-muted)">{c.summary}</p>
          <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 2xl:grid-cols-3">
            {c.modules.map((m) => (
              <li key={m.id} className="flex">
                <button type="button" onClick={() => onOpen(m.id)} className="group flex w-full flex-col rounded-xl border border-(--border-color) p-4 text-left transition hover:border-(--brand-ink) hover:shadow-(--shadow-sm)">
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--brand-light) text-(--brand-ink)">{renderIcon(m.iconName, "text-sm")}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-(--text-primary)">{m.title}</span>
                    <i className="pi pi-arrow-right text-xs text-(--text-muted) transition group-hover:translate-x-0.5 group-hover:text-(--brand-ink)" aria-hidden />
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-(--text-muted)">{m.summary}</span>
                  {!reaches(m) && <span className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-(--text-muted)">Not your role</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One module: its title and summary, every topic as a headed section, then previous and next. */
function Article({ chapter, module, outside, ordered, onOpen }: {
  chapter: ManualChapter;
  module: ManualModule;
  outside: boolean;
  ordered: { chapter: ManualChapter; module: ManualModule }[];
  onOpen: (m: string | null, topic?: string) => void;
}) {
  const at = ordered.findIndex((x) => x.module.id === module.id);
  const previous = ordered[at - 1]?.module;
  const next = ordered[at + 1]?.module;

  return (
    <div className="max-w-3xl">
      <header className="border-b border-(--border-color) pb-6">
        <p className="m-0 text-xs text-(--text-muted)">
          <button type="button" onClick={() => onOpen(null)} className="hover:text-(--brand-ink) hover:underline">
            Manual
          </button>{" "}
          › {chapter.title}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brand-light) text-(--brand-ink)">{renderIcon(module.iconName, "text-lg")}</span>
          <div className="min-w-0">
            <h2 className="m-0 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-(--text-primary)">
              {module.title}
              {outside && <span className="rounded-full border border-(--border-color) px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--text-muted)">Not part of your role</span>}
            </h2>
            <p className="m-0 mt-1.5 text-base leading-relaxed text-(--text-secondary)">{module.summary}</p>
          </div>
        </div>
      </header>

      <div>
        {module.topics.map((topic) => (
          <section key={topic.title} id={slug(topic.title)} className="scroll-mt-4 pt-8" aria-labelledby={`${slug(topic.title)}-h`}>
            <h3 id={`${slug(topic.title)}-h`} className="group m-0 flex items-center gap-2 text-lg font-semibold text-(--text-primary)">
              {topic.title}
              <a href={`#${slug(topic.title)}`} aria-label={`Link to ${topic.title}`} className="pi pi-link text-xs text-(--text-muted) opacity-0 transition group-hover:opacity-100" />
            </h3>
            <Topic topic={topic} />
          </section>
        ))}
      </div>

      <footer className="mt-10 grid gap-3 border-t border-(--border-color) pt-6 sm:grid-cols-2">
        {previous ? (
          <button type="button" onClick={() => onOpen(previous.id)} className="rounded-xl border border-(--border-color) p-3 text-left hover:border-(--brand-ink)">
            <span className="block text-[11px] text-(--text-muted)">
              <i className="pi pi-arrow-left mr-1 text-[10px]" aria-hidden />
              Previous
            </span>
            <span className="block text-sm font-semibold text-(--text-primary)">{previous.title}</span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" onClick={() => onOpen(next.id)} className="rounded-xl border border-(--border-color) p-3 text-right hover:border-(--brand-ink)">
            <span className="block text-[11px] text-(--text-muted)">
              Next
              <i className="pi pi-arrow-right ml-1 text-[10px]" aria-hidden />
            </span>
            <span className="block text-sm font-semibold text-(--text-primary)">{next.title}</span>
          </button>
        )}
      </footer>
    </div>
  );
}

/** A topic's paragraph, then its steps (numbered, joined by a line), what is good to know, and its warning. */
function Topic({ topic }: { topic: ManualTopic }) {
  return (
    <div className="mt-2">
      <p className="m-0 text-[0.9375rem] leading-relaxed text-(--text-secondary)">{topic.body}</p>
      {topic.steps && (
        <ol className="m-0 mt-4 list-none p-0">
          {topic.steps.map((step, i) => (
            <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
              {i < topic.steps!.length - 1 && <span aria-hidden className="absolute left-3 top-7 bottom-0 w-px bg-(--border-color)" />}
              <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-(--brand) text-[11px] font-bold text-white">{i + 1}</span>
              <span className="pt-0.5 text-sm leading-relaxed text-(--text-secondary)">{step}</span>
            </li>
          ))}
        </ol>
      )}
      {topic.notes && (
        <div className="mt-4 rounded-r-lg border-l-4 border-(--brand) bg-(--brand-light) px-4 py-3">
          <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-(--brand-ink)">
            <i className="pi pi-info-circle text-xs" aria-hidden /> Good to know
          </p>
          <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
            {topic.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-(--brand-ink)" />
                <span className="text-sm leading-relaxed text-(--text-secondary)">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {topic.warning && (
        // Amber, not red: nothing is broken; it names a mistake before it is made.
        <p className="m-0 mt-4 flex gap-2.5 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <i className="pi pi-exclamation-triangle mt-0.5 shrink-0 text-amber-500" aria-hidden />
          <span>{topic.warning}</span>
        </p>
      )}
    </div>
  );
}

/** Every topic matching the search, with its place in the manual and the words around the match. */
function SearchResults({ query, search, results, canWiden, onOpen }: {
  query: string;
  search: string;
  results: { chapter: ManualChapter; module: ManualModule; topic: ManualTopic }[];
  canWiden: boolean;
  onOpen: (m: string, topic: string) => void;
}) {
  return (
    <section className="max-w-3xl" aria-live="polite">
      <p className="m-0 text-sm text-(--text-secondary)">
        {plural(results.length, "topic")} matching &quot;{query}&quot;
      </p>
      {results.length === 0 ? (
        <div className="py-10 text-center">
          <i className="pi pi-search text-2xl text-(--text-muted)" aria-hidden />
          <p className="m-0 mt-2 text-sm text-(--text-secondary)">Nothing in the manual matches that.</p>
          <p className="m-0 mt-1 text-xs text-(--text-muted)">{canWiden ? "Try a shorter word, or turn on Show every module." : "Try a shorter word."}</p>
        </div>
      ) : (
        <ul className="m-0 mt-3 list-none divide-y divide-(--border-color) p-0">
          {results.map(({ chapter, module, topic }) => (
            <li key={`${module.id}-${topic.title}`}>
              <button type="button" onClick={() => onOpen(module.id, slug(topic.title))} className="w-full rounded-lg px-2 py-3 text-left hover:bg-(--sidebar-hover-bg)">
                <span className="block text-[11px] text-(--text-muted)">
                  {chapter.title} › {module.title}
                </span>
                <span className="block text-sm font-semibold text-(--text-primary)">
                  <Marked text={topic.title} search={search} />
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-(--text-secondary)">
                  <Marked text={snippet(topic, search)} search={search} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "On this page": the module's topics, the one being read marked as the page scrolls. */
function OnThisPage({ topics, onOpen }: { topics: ManualTopic[]; onOpen: (topic: string) => void }) {
  const [active, setActive] = useState(slug(topics[0]?.title ?? ""));
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (seen) setActive(seen.target.id);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );
    topics.forEach((t) => {
      const el = document.getElementById(slug(t.title));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [topics]);

  return (
    <nav aria-label="On this page" className="hidden px-5 py-8 xl:sticky xl:top-0 xl:block xl:self-start">
      <p className="m-0 mb-2 text-xs font-semibold text-(--text-primary)">On this page</p>
      <ul className="m-0 list-none border-l border-(--border-color) p-0">
        {topics.map((t) => {
          const id = slug(t.title);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onOpen(id)}
                className={`-ml-px block border-l-2 py-1 pl-3 text-left text-[13px] ${active === id ? "border-(--brand-ink) font-semibold text-(--brand-ink)" : "border-transparent text-(--text-muted) hover:text-(--text-primary)"}`}
              >
                {t.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
