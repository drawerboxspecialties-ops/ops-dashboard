"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APP_EXTRA_LINKS,
  ORG_NAME,
  PAGE_APP_OVERRIDES,
  VERCEL_APPS,
  formatAppName,
  type HubApp,
} from "@/lib/hub-apps";

type GithubRepo = {
  name: string;
  description?: string | null;
  has_pages?: boolean;
  updated_at?: string;
};

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function hostClass(host: string) {
  if (host === "Vercel") return "bg-teal-50 text-teal-800";
  if (host === "Local") return "bg-amber-50 text-amber-900";
  return "bg-stone-100 text-stone-600";
}

export function HubGrid() {
  const [apps, setApps] = useState<HubApp[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState("");
  const hotkey = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
    return mac ? "⌘K" : "Ctrl K";
  }, []);

  async function loadApps() {
    try {
      let pageApps: HubApp[] = [];
      let githubFailed = false;
      try {
        const response = await fetch(`https://api.github.com/users/${ORG_NAME}/repos?sort=updated&per_page=100`, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
        const repos = (await response.json()) as GithubRepo[];
        const hidden = new Set(["ops-dashboard", "dbs-rta-quote-calculator"]);
        pageApps = repos
          .filter((repo) => repo.has_pages && !hidden.has(String(repo.name).toLowerCase()))
          .map((repo) => {
            const key = String(repo.name).toLowerCase();
            const override = PAGE_APP_OVERRIDES[key] || {};
            return {
              name: repo.name,
              title: override.title || formatAppName(repo.name),
              description: override.description || repo.description || "Internal production tool.",
              updated_at: repo.updated_at || "",
              host: "Pages",
              url: `https://${ORG_NAME}.github.io/${encodeURIComponent(repo.name)}/`,
              extraLinks: APP_EXTRA_LINKS[key] || [],
            };
          });
      } catch (error) {
        console.error(error);
        githubFailed = true;
      }

      const pageNames = new Set(pageApps.map((app) => app.name.toLowerCase()));
      const vercelApps = VERCEL_APPS.filter((app) => {
        const key = String(app.name).toLowerCase();
        if (app.alongsidePages) return true;
        return !pageNames.has(key);
      });

      const next = [...vercelApps, ...pageApps].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      if (next.length === 0 && githubFailed) {
        setFailed(true);
        setApps([]);
        return;
      }
      setApps(next);
      setUpdated(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadApps();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("search")?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const filtered = query.trim()
    ? apps.filter((app) => `${app.title} ${app.name} ${app.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    : apps;

  function signOut() {
    void fetch("/api/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      window.location.href = "/login";
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <header className="mb-8 md:mb-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-800">Drawer Box Specialties</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
              Operations Hub
            </h1>
            <p className="mt-2 text-sm text-stone-600 md:text-[15px]">Internal tools in one place. Open a system below.</p>
          </div>
          <div className="w-full md:w-[22rem]">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </span>
              <input
                id="search"
                type="search"
                placeholder="Search tools"
                aria-label="Search tools"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white/90 py-2.5 pl-10 pr-16 text-sm text-stone-900 outline-none ring-teal-600/20 placeholder:text-stone-400 focus:border-teal-600 focus:ring-4"
              />
              <span className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 sm:inline">
                {hotkey}
              </span>
            </label>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
              <span>
                <span>{busy ? "—" : String(apps.length)}</span> tools · <span>{updated || "…"}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBusy(true);
                    void loadApps();
                  }}
                  disabled={busy}
                  className="rounded-lg px-2 py-1 font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  Refresh
                </button>
                <button type="button" onClick={signOut} className="rounded-lg px-2 py-1 font-semibold text-stone-500 transition hover:bg-stone-100">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4" aria-live="polite">
        {failed ? (
          <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50/80 px-6 py-14 text-center">
            <p className="text-sm font-semibold text-rose-800">Could not load tools from GitHub.</p>
            <p className="mt-1 text-xs text-rose-600/80">Check the network or rate limit, then refresh.</p>
          </div>
        ) : busy && apps.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-stone-500">Loading tools…</div>
        ) : apps.length === 0 ? (
          <Empty title="No tools found" message="Enable GitHub Pages or add a Vercel app in hub-apps." />
        ) : filtered.length === 0 ? (
          <Empty title="No matches" message={`Nothing matches “${query.trim()}”.`} />
        ) : (
          filtered.map((app) => <AppCard key={`${app.host}-${app.name}`} app={app} />)
        )}
      </main>
    </div>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-stone-800">{title}</p>
      <p className="mt-1 text-xs text-stone-500">{message}</p>
    </div>
  );
}

function AppCard({ app }: { app: HubApp }) {
  const extraLinks = app.extraLinks ?? [];
  return (
    <article className="tool-card group flex min-h-[124px] flex-col rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${hostClass(app.host)}`}>
          {app.host}
        </span>
        <span className="text-[10px] font-medium tracking-wider text-stone-400 uppercase">{formatDate(app.updated_at)}</span>
      </div>
      <h2 className="font-display text-[15px] leading-snug font-bold tracking-tight text-stone-900 transition group-hover:text-teal-800 line-clamp-2">
        <a href={app.url} target="_blank" rel="noopener noreferrer" className="focus:underline focus:outline-none">
          {app.title || formatAppName(app.name)}
        </a>
      </h2>
      <p className="mt-1.5 flex-1 text-[12px] leading-snug text-stone-500 line-clamp-2">
        {app.description || "Internal production tool."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold text-teal-800 transition hover:text-teal-950 focus:underline focus:outline-none"
        >
          {app.cta || "Open"} →
        </a>
        {extraLinks.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold text-teal-800 transition hover:text-teal-950 focus:underline focus:outline-none"
          >
            {link.label} →
          </a>
        ))}
      </div>
    </article>
  );
}
