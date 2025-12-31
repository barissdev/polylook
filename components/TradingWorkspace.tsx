// components/TradingWorkspace.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ChatPanel from "@/components/ChatPanel";

type WhaleTrade = {
  marketId: string;
  marketQuestion: string;
  side: "yes" | "no";
  amountUsd: number;
  price: number;
  timestamp: string;
  url?: string;
};

type WhaleResponse = {
  windowMinutes: number;
  thresholdUsd: number;
  whales: WhaleTrade[];
};

const REFRESH_MS = 10000; // 10 saniye

type Mode = "whales" | "flow";

export default function TradingWorkspace() {
  const [data, setData] = useState<WhaleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("whales");

  async function fetchWhales() {
    try {
      const res = await fetch("/api/whales", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Whale verisi alınamadı");
      }
      const json: WhaleResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error("Whale fetch error:", err);
      setError("Veri alınırken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWhales();
    const id = setInterval(fetchWhales, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const whaleData = data;

  // Whales: büyüklüğe göre, Flow: zamana göre
  const sortedWhales = useMemo(() => {
    if (!whaleData) return [];
    const arr = [...whaleData.whales];

    if (mode === "whales") {
      return arr.sort((a, b) => b.amountUsd - a.amountUsd);
    } else {
      return arr.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  }, [whaleData, mode]);

  return (
    <section className="rounded-[32px] border border-slate-800 bg-gradient-to-br from-black/95 via-[#070512] to-[#05030B] p-5 md:p-6 shadow-[0_32px_90px_rgba(0,0,0,1)]">
      {/* Başlık satırı */}
      <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-[0.25em]">
            Trading workspace
          </span>
          <span className="text-slate-500">
            Wallet Tracker · AI Chatbot · 5.000$+ Whale Flow
          </span>
        </div>
        <span className="hidden md:inline text-slate-500">
          Auto-refresh · 10s
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] min-h-[430px] md:min-h-[520px]">
        {/* Sol: Chat alanı */}
        <div className="rounded-3xl border border-slate-800 bg-[#050915] overflow-hidden">
          <ChatPanel />
        </div>

        {/* Sağ: 5000$ üstü anlık bildirimler */}
        <div className="flex flex-col gap-4">
          {/* üst info bar */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-col gap-1">
              <span className="uppercase tracking-[0.25em] text-slate-400">
                5000$+ live flow
              </span>
              <span className="text-slate-500">
                {whaleData
                  ? `Trades above $${whaleData.thresholdUsd.toLocaleString()} in the last ${whaleData.windowMinutes} minutes.`
                  : "Loading latest trades..."}
              </span>
            </div>
            <div className="flex flex-col items-end text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                {whaleData ? `${whaleData.whales.length} active trades` : "—"}
              </span>
            </div>
          </div>

          {/* feed kartı */}
          <div className="flex-1 rounded-3xl border border-slate-800 bg-black/85 p-3.5 md:p-4 space-y-3 shadow-[0_22px_70px_rgba(0,0,0,0.9)]">
            {/* header tabs + sort */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode("whales")}
                  className={
                    "rounded-full px-2 py-1 text-[10px] transition " +
                    (mode === "whales"
                      ? "bg-slate-50 text-slate-900"
                      : "bg-slate-900/60 text-slate-400 hover:text-slate-200")
                  }
                >
                  Whales
                </button>
                <button
                  onClick={() => setMode("flow")}
                  className={
                    "rounded-full px-2 py-1 text-[10px] transition " +
                    (mode === "flow"
                      ? "bg-slate-50 text-slate-900"
                      : "bg-slate-900/60 text-slate-400 hover:text-slate-200")
                  }
                >
                  Flow
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-slate-500">Sort</span>
                <span className="rounded-full bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300">
                  {mode === "whales" ? "by size (desc)" : "by time (newest)"}
                </span>
              </div>
            </div>

            {/* durumlar */}
            {loading && !whaleData && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-6 text-center text-xs text-slate-500">
                Veri yükleniyor...
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-3 py-3 text-center text-xs text-rose-200">
                {error}
              </div>
            )}

            {/* feed listesi */}
            {whaleData && sortedWhales.length > 0 && (
              <div className="whale-scroll overflow-y-auto min-h-[220px] md:min-h-[260px] max-h-[480px] space-y-1.5 pr-1">
                {sortedWhales.map((w, index) => {
                  const isFresh = index < 2;
                  const ratio = Math.min(
                    (w.amountUsd / whaleData.thresholdUsd) * 100,
                    100
                  );
                  const clickable = !!w.url;

                  return (
                    <a
                      key={w.marketId + w.timestamp + w.side + index}
                      href={clickable ? w.url : undefined}
                      target={clickable ? "_blank" : undefined}
                      rel={clickable ? "noreferrer" : undefined}
                      className={
                        "block rounded-2xl " +
                        (clickable
                          ? "cursor-pointer"
                          : "cursor-default pointer-events-none")
                      }
                    >
                      <div
                        className={
                          "relative border border-slate-800/90 bg-[#050915] px-3 py-2.5 text-[11px] flex items-start gap-3 hover:border-emerald-400/70 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)] transition " +
                          (isFresh
                            ? "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-emerald-500/12 before:via-transparent before:to-transparent"
                            : "")
                        }
                      >
                        {/* yan renk şeridi */}
                        <div
                          className={
                            "mt-0.5 h-7 w-1 rounded-full " +
                            (w.side === "yes"
                              ? "bg-emerald-400/80"
                              : "bg-rose-400/80")
                          }
                        />

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="line-clamp-1 font-medium text-slate-50">
                              {w.marketQuestion}
                            </div>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {new Date(w.timestamp).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  "inline-flex items-center rounded-full px-2 py-0.5 font-medium " +
                                  (w.side === "yes"
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-rose-500/10 text-rose-300")
                                }
                              >
                                {w.side === "yes" ? "YES" : "NO"}
                              </span>
                              <span className="text-slate-500">
                                ${w.amountUsd.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">
                                @ {w.price.toFixed(2)}
                              </span>
                              <span className="h-1 w-14 rounded-full bg-slate-800 overflow-hidden">
                                <span
                                  className={
                                    "block h-full " +
                                    (w.side === "yes"
                                      ? "bg-emerald-400"
                                      : "bg-rose-400")
                                  }
                                  style={{ width: `${ratio}%` }}
                                />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {whaleData &&
              sortedWhales.length === 0 &&
              !loading &&
              !error && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-6 text-center text-xs text-slate-500">
                  No whale trades above threshold at the moment. New trades will appear here when they occur.
                </div>
              )}
          </div>
        </div>
      </div>
    </section>
  );
}