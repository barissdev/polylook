// app/new-markets/page.tsx
"use client";

import { useEffect, useState } from "react";

type NewMarket = {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  image?: string | null;
  createdAt: string | null;
  liquidityUsd: number;
  volume24hUsd: number;
  url: string;
};

type ApiResponse =
  | { markets: NewMarket[] }
  | { error: string };

const formatTime = (iso: string | null) => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatUsdShort = (n: number) =>
  "$" + Math.round(n).toLocaleString(undefined);

export default function NewMarketsPage() {
  const [markets, setMarkets] = useState<NewMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/new-markets", { cache: "no-store" });
        const data = await res.json();

        if (abort) return;

        // 1) API { markets: [...] } döndürüyorsa
        if (data && Array.isArray(data.markets)) {
          setMarkets(data.markets as NewMarket[]);
          return;
        }

        // 2) API direkt array döndürüyorsa
        if (Array.isArray(data)) {
          setMarkets(data as NewMarket[]);
          return;
        }

        // 3) Error field varsa
        if (data && typeof data.error === "string") {
          setErrorMsg(data.error);
          setMarkets([]);
          return;
        }

        // 4) Diğer durumlar
        setErrorMsg("Failed to load new markets.");
        setMarkets([]);
      } catch (err) {
        console.error("new-markets page error:", err);
        if (!abort) {
          setErrorMsg("Failed to load new markets.");
          setMarkets([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000); // auto refresh: 60s

    return () => {
      abort = true;
      clearInterval(interval);
    };
  }, []);

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
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>New markets</span>
          </div>

          <h1 className="text-[28px] md:text-[34px] lg:text-[40px] font-semibold tracking-tight leading-tight">
            Fresh Polymarket events from the{" "}
            <span className="bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              last hour
            </span>
            .
          </h1>

          <p className="max-w-xl text-[13px] md:text-[15px] leading-relaxed text-slate-400">
            See markets that were listed on Polymarket in the last 60 minutes.
            Perfect for catching narratives right as they appear.
          </p>
        </section>

        {/* List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Auto refresh · 60s · window: last 6 hours</span>
            <span>
              {loading
                ? "Updating…"
                : markets.length > 0
                ? `${markets.length} market${markets.length === 1 ? "" : "s"}`
                : "No markets found"}
            </span>
          </div>

          <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80 scroll-shell">
            {errorMsg && (
              <div className="px-4 py-8 text-center text-sm text-rose-300">
                {errorMsg}
              </div>
            )}

            {!errorMsg && markets.length === 0 && !loading && (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No new markets were listed in the last hour. Check back soon.
              </div>
            )}

            <ul className="divide-y divide-slate-800/80">
              {markets.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-900/70"
                >
                  {/* Thumbnail / icon */}
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-slate-900/90 text-lg">
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>🆕</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] font-medium text-slate-100 hover:text-sky-300"
                      >
                        {m.title}
                      </a>
                      <span className="text-[11px] text-slate-500">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>

                    {m.subtitle && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {m.subtitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        {m.category && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                            <span>{m.category}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5">
                          Vol 24h:{" "}
                          <span className="font-medium text-slate-100">
                            {formatUsdShort(m.volume24hUsd)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5">
                          Liquidity:{" "}
                          <span className="font-medium text-slate-100">
                            {formatUsdShort(m.liquidityUsd)}
                          </span>
                        </span>
                      </div>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 hover:border-amber-400 hover:text-amber-300 transition"
                      >
                        Open on Polymarket
                      </a>
                    </div>
                  </div>
                </li>
              ))}

              {loading && (
                <li className="px-4 py-4 text-center text-[13px] text-slate-400">
                  Loading latest markets…
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
