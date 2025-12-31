"use client";

import {
  useState,
  useRef,
  type CSSProperties,
  FormEvent,
} from "react";

type PnlCardSummary = {
  address: string;
  realizedPnlUsd: number;
  openPnlUsd: number;
  volumeUsd: number;
  tradesCount: number;
  winRate: number;
  firstTradeTs: number | null;
  lastTradeTs: number | null;
  profileLabel: string;
  leaderboardRank?: number | null;
  mostBetCategory?: string | null;
  mostBetExample?: string | null;
};

const EMOJIS = ["📊", "📈", "🧠", "🐋", "🦈", "🤖", "🧪", "🧿"];

type BuiltinWallpaperKey = "none" | "emerald" | "violet" | "sunset";

const WALLPAPER_STYLES: Record<BuiltinWallpaperKey, CSSProperties> = {
  none: {},
  emerald: {
    backgroundImage:
      "radial-gradient(circle at top left, rgba(45,212,191,0.3), transparent 55%), radial-gradient(circle at bottom right, rgba(59,130,246,0.3), transparent 55%)",
  },
  violet: {
    backgroundImage:
      "radial-gradient(circle at top, rgba(129,140,248,0.45), transparent 55%), radial-gradient(circle at bottom, rgba(236,72,153,0.4), transparent 55%)",
  },
  sunset: {
    backgroundImage:
      "radial-gradient(circle at top left, rgba(249,115,22,0.5), transparent 55%), radial-gradient(circle at bottom right, rgba(250,204,21,0.4), transparent 55%)",
  },
};

function formatUsdSigned(n: number) {
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  return (
    sign +
    abs.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })
  );
}

function formatUsdPlain(n: number) {
  return (
    "$" +
    n.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })
  );
}

export default function PnlCardPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [name, setName] = useState("Polylook trader");
  const [emoji, setEmoji] = useState("📊");
  const [days, setDays] = useState(30);

  const [builtinWallpaper, setBuiltinWallpaper] =
    useState<BuiltinWallpaperKey>("emerald");
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(
    null
  );

  const [data, setData] = useState<PnlCardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleGenerate = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const addr = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError("Please enter a valid 0x… Polymarket wallet address.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/pnl-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, days }),
      });

      if (!res.ok) {
        console.error("pnl-card error:", await res.text());
        setError("Failed to load data from Polymarket.");
        setData(null);
        return;
      }

      const json = (await res.json()) as PnlCardSummary;
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Unexpected error while generating card.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

 const handleDownloadImage = async () => {
  if (!cardRef.current) return;

  try {
    // html2canvas hem default hem de named export olabiliyor,
    // ikisini de destekle:
    const html2canvasModule = await import("html2canvas");
    const html2canvas =
      (html2canvasModule as any).default || (html2canvasModule as any);

    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: window.devicePixelRatio || 2,
      useCORS: true, // her ihtimale karşı
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "polylook-pnl-card.png";
    link.click();
  } catch (err) {
    console.error("html2canvas error:", err);
    alert("Could not generate image. Please try again.");
  }
};

  // chance: winRate varsa onu kullan, yoksa 50
  const chance = (() => {
    if (data && typeof data.winRate === "number" && data.winRate > 0) {
      return Math.max(0, Math.min(100, Math.round(data.winRate)));
    }
    return 50;
  })();

  const chanceDeg = (chance / 100) * 360;

  const realized = data?.realizedPnlUsd ?? 0;
  const vol = data?.volumeUsd ?? 0;
  const trades = data?.tradesCount ?? 0;

  // Wallpaper style
  const wallpaperStyle: CSSProperties = customWallpaperUrl
    ? {
        backgroundImage: `url(${customWallpaperUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : WALLPAPER_STYLES[builtinWallpaper];

  // Custom wallpaper upload
  const handleWallpaperFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomWallpaperUrl(url);
  };

  return (
    <main className="min-h-screen bg-[#05030B] text-slate-50">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-24">
        {/* HEADER */}
        <section className="mt-10 mb-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-black/70 px-3 py-1 text-[11px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>PnL card generator</span>
            <span className="ml-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400">
              v0.3 · Beta
            </span>
          </div>

          <h1 className="text-[30px] md:text-[38px] lg:text-[44px] font-semibold leading-tight tracking-tight">
            Turn your Polymarket history into a{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300 bg-clip-text text-transparent">
              shareable card
            </span>
            .
          </h1>

          <p className="max-w-xl text-[13px] md:text-[15px] leading-relaxed text-slate-400">
            Generate a Polymarket-style market card with your realized PnL and
            activity. Choose emoji, name, wallpaper and export it as an image
            for your X / profile.
          </p>
        </section>

        {/* GRID: SETTINGS + PREVIEW */}
        <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
          {/* LEFT – SETTINGS */}
          <form
            onSubmit={handleGenerate}
            className="rounded-2xl border border-slate-800 bg-[#050814]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.9)]"
          >
            <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium uppercase tracking-[0.16em] text-slate-300">
                Card settings
              </span>
            </div>

            {/* Emoji */}
            <div className="mb-4 flex flex-col gap-2 text-xs text-slate-300">
              <span className="text-[11px] text-slate-400">Emoji</span>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-xl border text-lg transition-all " +
                      (emoji === e
                        ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_14px_rgba(16,185,129,0.5)]"
                        : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500")
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="mb-4 space-y-1 text-xs">
              <label className="text-[11px] text-slate-400">Name / alias</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Polylook trader"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Address */}
            <div className="mb-4 space-y-1 text-xs">
              <label className="text-[11px] text-slate-400">
                Wallet address
              </label>
              <input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... Polymarket wallet address"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Time range */}
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-[11px] text-slate-400">
                Time range (volume & PnL)
              </span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
                <option value={3650}>All time</option>
              </select>
            </div>

            {/* Wallpaper */}
            <div className="mb-4 space-y-1 text-xs">
              <label className="text-[11px] text-slate-400">Wallpaper</label>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {(["emerald", "violet", "sunset"] as BuiltinWallpaperKey[])
                  .filter((k) => k !== "none")
                  .map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setBuiltinWallpaper(key);
                        setCustomWallpaperUrl(null);
                      }}
                      className={
                        "rounded-full border px-3 py-1 capitalize " +
                        (builtinWallpaper === key && !customWallpaperUrl
                          ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500")
                      }
                    >
                      {key}
                    </button>
                  ))}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 hover:border-slate-500">
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperFile}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-500">
                Uploading a custom image will override the built-in gradients.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 rounded-lg border border-rose-600/60 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Generating…" : "Generate card"}
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-200 hover:border-slate-400"
              >
                Download image
              </button>
            </div>

            <p className="mt-4 text-[10px] text-slate-500">
              Data is fetched live from Polymarket&apos;s Data API and may be
              approximate.
            </p>
          </form>

          {/* RIGHT – POLYMARKET-STYLE CARD PREVIEW */}
          <div className="relative">
            <div
              ref={cardRef}
              className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 p-4 shadow-[0_25px_85px_rgba(0,0,0,0.96)]"
              style={wallpaperStyle}
            >
              {/* Dark overlay for readability */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-slate-950/75" />

              <div className="relative flex items-center justify-between gap-4">
                {/* LEFT: logo + title */}
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/90 text-2xl">
                    {emoji}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-50">
                      {name || "Polylook trader"}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                      Realized PnL{" "}
                      <span
                        className={
                          realized >= 0
                            ? "text-emerald-300 font-semibold"
                            : "text-rose-300 font-semibold"
                        }
                      >
                        {formatUsdSigned(realized)}
                      </span>{" "}
                      · {formatUsdPlain(vol)} vol ·{" "}
                      {trades.toLocaleString()} trades
                    </span>
                  </div>
                </div>

                {/* RIGHT: probability gauge */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full bg-slate-900" />
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundImage: `conic-gradient(#f97316 0deg, #f97316 ${chanceDeg}deg, rgba(148,163,184,0.3) ${chanceDeg}deg)`,
                      }}
                    />
                    <div className="relative m-1 flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full bg-slate-950">
                      <span className="text-xs font-semibold text-slate-50">
                        {chance}%
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                        chance
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Win rate proxy
                  </span>
                </div>
              </div>

              {/* BOTTOM BAR */}
              <div className="relative mt-4 flex items-center justify-between text-[11px] text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <span className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                    Polylook · PnL card
                  </span>
                  {data?.address && (
                    <span className="font-mono text-[10px] text-slate-500">
                      {data.address.slice(0, 6)}…{data.address.slice(-4)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {days >= 3650 ? "All time" : `Last ${days} days`}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}