// components/Dashboard.tsx
"use client";

import { motion } from "framer-motion";
import ChatPanel from "@/components/ChatPanel";

type WhaleTrade = {
  marketId: string;
  marketQuestion: string;
  side: "yes" | "no";
  amountUsd: number;
  price: number;
  timestamp: string;
};

type WhaleResponse = {
  windowMinutes: number;
  thresholdUsd: number;
  whales: WhaleTrade[];
};

type ConfidenceMarket = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  liquidityUsd: number;
  volume24hUsd: number;
  volatility24h: number;
  confidence: number;
};

type ConfidenceResponse = {
  markets: ConfidenceMarket[];
};

type DashboardProps = {
  whaleData: WhaleResponse;
  confidenceData: ConfidenceResponse;
};

export default function Dashboard({ whaleData, confidenceData }: DashboardProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Arka plan glow'lar */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8">
        {/* NAVBAR */}
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between text-[11px] md:text-xs text-slate-400"
        >
          <button className="uppercase tracking-[0.25em] hover:text-slate-100 transition">
            Wallet Tracker
          </button>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
              Polymarket companion
            </span>
            <span className="text-sm md:text-base font-semibold tracking-[0.25em] text-slate-100">
              Polylook
            </span>
          </div>

          <button className="uppercase tracking-[0.25em] hover:text-slate-100 transition">
            Card Generate
          </button>
        </motion.nav>

        {/* Hero text */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-2 md:space-y-3"
        >
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            What do you want to see on&nbsp;
            <span className="text-emerald-400">Polymarket</span>?
          </h1>
          <p className="text-sm md:text-[15px] text-slate-400 max-w-2xl">
            AI chatbot on the left that talks with wallet + event links,
            live whale feed above $5,000 and market confidence scores on the right.
          </p>
        </motion.section>

        {/* ANA GRID */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="grid gap-6 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.3fr)] min-h-[70vh]"
        >
          {/* Sol: AI CHATBOT */}
          <motion.div
            className="h-full"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            <ChatPanel />
          </motion.div>

          {/* Sağ: Whale + Confidence */}
          <motion.div
            className="flex flex-col gap-6"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            {/* 5000$ ÜSTÜ ANLIK BİLDİRİM */}
            <section className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-4 md:p-5 shadow-[0_0_40px_rgba(15,23,42,0.9)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400 mb-1">
                    LIVE ALERTS ABOVE $5000
                  </div>
                  <p className="text-[11px] md:text-xs text-slate-400">
                    Trades above ${whaleData.thresholdUsd.toLocaleString()} in the last {whaleData.windowMinutes} minutes.
                  </p>
                </div>
                <div className="hidden md:flex text-[11px] text-slate-500">
                  {whaleData.whales.length} trade
                </div>
              </div>

              <div className="overflow-y-auto max-h-[260px] rounded-xl border border-slate-800/80 bg-slate-950/70">
                <table className="w-full text-[11px] md:text-xs">
                  <thead className="bg-slate-900/80">
                    <tr className="text-left text-slate-400">
                      <th className="px-3 py-2">Market</th>
                      <th className="px-3 py-2">Yön</th>
                      <th className="px-3 py-2 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whaleData.whales.map((w) => (
                      <tr
                        key={w.marketId + w.timestamp + w.side}
                        className="border-t border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-slate-100 line-clamp-1">
                            {w.marketQuestion}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(w.timestamp).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                              (w.side === "yes"
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-rose-500/10 text-rose-300")
                            }
                          >
                            {w.side === "yes" ? "YES" : "NO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-right text-[10px] md:text-[11px]">
                          ${w.amountUsd.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {whaleData.whales.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-center text-slate-500 text-xs"
                        >
                          No whale trades above threshold at the moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* MARKET CONF SCORE */}
            <section className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-4 md:p-5 shadow-[0_0_40px_rgba(15,23,42,0.9)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400 mb-1">
                    MARKET CONF SCORE
                  </div>
                  <p className="text-[11px] md:text-xs text-slate-400">
                    Likidite, hacim ve volatiliteye göre hesaplanan market
                    güven skorları (0–100).
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {confidenceData.markets.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2 hover:border-emerald-500/60 hover:bg-slate-900 transition-colors"
                  >
                    <div className="text-xs font-medium text-slate-100 line-clamp-2">
                      {m.question}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        YES {Math.round(m.yesPrice * 100)} · NO{" "}
                        {Math.round(m.noPrice * 100)}
                      </span>
                      <span className="font-medium text-emerald-400">
                        Conf {m.confidence}/100
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${m.confidence}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>LiQ ${m.liquidityUsd.toLocaleString()}</span>
                      <span>Vol ${m.volume24hUsd.toLocaleString()}</span>
                      <span>σ {(m.volatility24h * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}