// components/CardPreview.tsx
"use client";

import { useState } from "react";

type CardData = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  confidence: number;
  whalesLast60m: number;
  url: string;
};

export default function CardPreview() {
  const [marketId, setMarketId] = useState("btc-100k-2025");
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/card?market=${encodeURIComponent(marketId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Kart alınamadı");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Bilinmeyen hata");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Prediction Card (Preview)</h2>
        <p className="text-sm text-slate-400">
          Enter a Polymarket market ID to see a shareable card preview in Polylook style.
          Example IDs for now: <code className="text-xs">btc-100k-2025</code>,{" "}
          <code className="text-xs">trump-win</code>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          placeholder="Örn: btc-100k-2025"
        />
        <button
          type="submit"
          disabled={loading || !marketId.trim()}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Yükleniyor..." : "Kart oluştur"}
        </button>
      </form>

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* Kart önizlemesi */}
      {data && (
        <div className="mt-2 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Polylook · Preview
            </div>
            <div className="text-[11px] text-slate-400">
              Conf {data.confidence}/100 · Whales {data.whalesLast60m} · YES{" "}
              {Math.round(data.yesPrice * 100)}
            </div>
          </div>

          <div className="text-base sm:text-lg font-semibold text-slate-50 mb-3">
            {data.question}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>YES</span>
                <span>{Math.round(data.yesPrice * 100)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${data.yesPrice * 100}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>NO</span>
                <span>{Math.round(data.noPrice * 100)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${data.noPrice * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate max-w-[60%]">{data.id}</span>
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              View on Polymarket ↗
            </a>
          </div>
        </div>
      )}
    </section>
  );
}