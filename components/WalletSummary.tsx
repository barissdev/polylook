// components/WalletSummary.tsx
"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";

type WalletSummary = {
  address: string;
  equityUsd: number;
  openPnlUsd: number;
  realizedPnlUsd: number;
  volume24hUsd: number;
  winRate: number;
  positionsOpen: number;
};

const DEFAULT_ADDRESS = "0xDEMO_POLYLOOK";

const formatUsd = (n: number) =>
  (n < 0 ? "-$" + Math.abs(n).toLocaleString() : "$" + n.toLocaleString());

export default function WalletSummaryPanel() {
  const [addressInput, setAddressInput] = useState(DEFAULT_ADDRESS);
  const [activeAddress, setActiveAddress] = useState(DEFAULT_ADDRESS);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let abort = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/wallet?address=${encodeURIComponent(activeAddress)}`
        );
        if (!res.ok) throw new Error("Wallet API error");
        const data = (await res.json()) as WalletSummary;
        if (!abort) setSummary(data);
      } catch (err) {
        console.error(err);
        if (!abort) setSummary(null);
      } finally {
        if (!abort) setLoading(false);
      }
    }

    load();
    return () => {
      abort = true;
    };
  }, [activeAddress]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (!trimmed) return;
    setActiveAddress(trimmed);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAddressInput(e.target.value);
  };

  return (
    <>
      {/* Address row */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 md:flex-row md:items-center"
      >
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            Wallet address
          </span>
          <input
            type="text"
            value={addressInput}
            onChange={handleChange}
            placeholder="0x... Polymarket wallet address"
            className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Sync wallet
          </button>
          <span className="text-[11px] text-slate-500">
            Current:{" "}
            <span className="font-mono text-slate-300">
              {activeAddress.slice(0, 6)}…{activeAddress.slice(-4)}
            </span>
          </span>
        </div>
      </form>

      {/* Stats grid */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Total equity</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary ? formatUsd(summary.equityUsd) : loading ? "…" : "--"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Total estimated portfolio value in your wallet.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Open PnL</p>
          <p
            className={
              "mt-2 text-2xl font-semibold " +
              (summary && summary.openPnlUsd >= 0
                ? "text-emerald-400"
                : "text-rose-400")
            }
          >
            {summary ? formatUsd(summary.openPnlUsd) : loading ? "…" : "--"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Unrealized profit/loss from currently open positions.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Realized PnL</p>
          <p
            className={
              "mt-2 text-2xl font-semibold " +
              (summary && summary.realizedPnlUsd >= 0
                ? "text-emerald-400"
                : "text-rose-400")
            }
          >
            {summary ? formatUsd(summary.realizedPnlUsd) : loading ? "…" : "--"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Accumulated profit/loss from closed positions to date.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">24h volume</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary ? formatUsd(summary.volume24hUsd) : loading ? "…" : "--"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Estimated trading volume through this wallet in the last 24 hours.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Win rate</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary ? `${summary.winRate}%` : loading ? "…" : "--"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Winning trade rate (mock). Will be calculated from closed positions in production.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Open positions</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary ? summary.positionsOpen : loading ? "…" : "--"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Number of markets currently open (mock data).
          </p>
        </div>
      </section>
    </>
  );
}