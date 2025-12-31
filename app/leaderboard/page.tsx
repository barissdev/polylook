// app/leaderboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Metric = "PNL" | "VOLUME";
type TimeTab = "TODAY" | "WEEKLY" | "MONTHLY" | "ALL";

type LeaderboardRow = {
  rank: number;
  address: string;
  name: string;
  pnlUsd: number;
  volumeUsd: number;
};

const formatUsd = (n: number) =>
  (n >= 0 ? "+" : "-") +
  "$" +
  Math.abs(n).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("PNL");
  const [timeTab, setTimeTab] = useState<TimeTab>("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q)
    );
  }, [rows, search]);

  useEffect(() => {
    let aborted = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timePeriod: timeTab,
            metric,
            limit: 100,
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load leaderboard");
        }

        const data = (await res.json()) as LeaderboardRow[];
        if (!aborted) setRows(data);
      } catch (err: any) {
        console.error("leaderboard error:", err);
        if (!aborted) setError(err.message || "Failed to load leaderboard");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();

    return () => {
      aborted = true;
    };
  }, [metric, timeTab]);

  const timeLabel =
    timeTab === "TODAY"
      ? "Today"
      : timeTab === "WEEKLY"
      ? "Weekly"
      : timeTab === "MONTHLY"
      ? "Monthly"
      : "All time";

  return (
    <main className="min-h-screen bg-[#05030B] text-slate-50">
      {/* Arka plan glow + grid */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-orange-500/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.06),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-10 pt-24">
        {/* HERO */}
        <section className="mt-12 mb-8 space-y-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-black/70 px-3 py-1 text-[11px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>Leaderboard</span>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3 max-w-xl">
              <h1 className="text-[28px] md:text-[34px] lg:text-[40px] font-semibold tracking-tight leading-tight">
                Top{" "}
                <span className="bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
                  Polymarket
                </span>{" "}
                traders.
              </h1>

              <p className="text-[13px] md:text-[15px] leading-relaxed text-slate-400">
                View Polymarket accounts with the highest PnL and volume all-time and by period in one place. Sort by PnL or volume, and explore addresses on Polygonscan.
              </p>
            </div>

            {/* Time tabs */}
            <div className="flex items-center gap-2 text-[13px] font-semibold self-start md:self-auto">
              {[
                { id: "TODAY", label: "Today" },
                { id: "WEEKLY", label: "Weekly" },
                { id: "MONTHLY", label: "Monthly" },
                { id: "ALL", label: "All" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeTab(t.id as TimeTab)}
                  className={`rounded-lg px-4 py-2 border transition-all ${
                    timeTab === t.id
                      ? "bg-sky-500 border-sky-500 text-slate-950 shadow-sm shadow-sky-500/30"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:border-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2">
            <span className="text-xs text-slate-400">Search by name</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Trader name or 0x address…"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* Metric + category */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-slate-800 bg-slate-950/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMetric("PNL")}
                className={`rounded-full px-3 py-1 ${
                  metric === "PNL"
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-400 hover:bg-slate-800/80"
                }`}
              >
                Profit/Loss
              </button>
              <button
                type="button"
                onClick={() => setMetric("VOLUME")}
                className={`rounded-full px-3 py-1 ${
                  metric === "VOLUME"
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-400 hover:bg-slate-800/80"
                }`}
              >
                Volume
              </button>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-400"
            >
              <span>All categories</span>
              <span className="text-[10px] text-slate-500">▼</span>
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/90">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-[11px] text-slate-400">
            <span>
              Showing top {rows.length || 0} traders · {timeLabel}
            </span>
            {loading && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                Updating…
              </span>
            )}
          </div>

          <div className="border-b border-slate-800 px-4 py-3 text-xs text-slate-400">
            <div className="flex items-center gap-6">
              <span className="w-8">#</span>
              <span className="flex-1">Trader</span>
              <span className="hidden w-32 text-right sm:inline">
                {metric === "PNL" ? "PnL" : "Volume"}
              </span>
              <span className="w-40 text-right">Actions</span>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto scroll-shell">
            {error && (
              <div className="px-4 py-10 text-center text-sm text-rose-300">
                {error}
              </div>
            )}

            {!error && filteredRows.length === 0 && !loading && (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No results found with these filters.
              </div>
            )}

            <ul className="divide-y divide-slate-800/80">
              {!error &&
                filteredRows.map((row) => {
                  const value =
                    metric === "PNL" ? row.pnlUsd : row.volumeUsd;
                  const isPositive = value >= 0;

                  return (
                    <li
                      key={row.address + row.rank}
                      className="flex items-center gap-6 px-4 py-3 hover:bg-slate-900/80"
                    >
                      <div className="w-8 text-[11px] text-slate-500">
                        {row.rank}
                      </div>

                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/90 text-xs font-semibold text-slate-100">
                          {row.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-slate-100">
                            {row.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {row.address.slice(0, 6)}…{row.address.slice(-4)}
                          </span>
                        </div>
                      </div>

                      <div className="hidden w-32 text-right text-[13px] sm:block">
                        <span
                          className={
                            "font-semibold " +
                            (isPositive
                              ? "text-emerald-400"
                              : "text-rose-400")
                          }
                        >
                          {formatUsd(value)}
                        </span>
                      </div>

                      <div className="flex w-40 justify-end">
                        <a
                          href={`https://polymarket.com/profile/${row.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 hover:border-sky-500 hover:text-sky-300"
                        >
                          View profile
                        </a>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}