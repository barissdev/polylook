// app/api/wallet-feed/route.ts
import { NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";

type FeedTrade = {
  id: string;
  address: string;
  label: string;
  emoji: string;
  market: string;
  side: "BUY" | "SELL";
  sizeUsd: number;
  timestamp: number;
};

type ActivityRow = {
  proxyWallet?: string;
  timestamp?: number;
  type?: string;
  usdcSize?: number;
  size?: number;
  price?: number;
  side?: "BUY" | "SELL";
  // market bilgisi için asıl kullandıklarımız:
  title?: string;       // örn: "Will BTC reach $100k in 2025?"
  slug?: string;
  eventSlug?: string;
  outcome?: string;     // örn: "Yes", "No", "Over", "Under"
};

// Güvenli JSON helper
async function safeJson<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    console.error("Polymarket API error:", url, res.status);
    return null as T | null;
  }

  try {
    const data = (await res.json()) as T;
    return data;
  } catch (e) {
    console.error("JSON parse error:", url, e);
    return null as T | null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || !Array.isArray(body.wallets)) {
    return NextResponse.json(
      { error: "wallets array required" },
      { status: 400 }
    );
  }

  const wallets: { address: string; label: string; emoji: string }[] =
    body.wallets;

  // adresleri normalize et
  const cleanWallets = wallets
    .map((w) => ({
      ...w,
      address: w.address.toLowerCase().trim(),
    }))
    .filter((w) => /^0x[a-f0-9]{40}$/.test(w.address));

  if (cleanWallets.length === 0) {
    return NextResponse.json<FeedTrade[]>([]);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const oneHourAgo = nowSec - 60 * 60; // şimdilik son 1 saat

  const allTrades: FeedTrade[] = [];

  for (const wallet of cleanWallets) {
    const url = `${DATA_API_BASE}/activity?user=${encodeURIComponent(
      wallet.address
    )}&limit=200`;

    const activity = await safeJson<ActivityRow[]>(url);
    if (!activity || !Array.isArray(activity)) continue;

    for (const ev of activity) {
      // temel filtreler: zaman + usdcSize
      if (
        typeof ev.timestamp !== "number" ||
        ev.timestamp < oneHourAgo ||
        typeof ev.usdcSize !== "number"
      ) {
        continue;
      }

      // sadece trade event'leri
      if (ev.type && ev.type !== "TRADE") continue;

      // market ismini doğru field'lardan üret
      let baseTitle =
        ev.title && ev.title.trim().length > 0
          ? ev.title.trim()
          : "";

      // fallback: eğer title yoksa slug'ı gösterelim
      if (!baseTitle && ev.eventSlug) {
        baseTitle = ev.eventSlug.replace(/-/g, " ");
      } else if (!baseTitle && ev.slug) {
        baseTitle = ev.slug.replace(/-/g, " ");
      }

      const outcomeLabel =
        ev.outcome && ev.outcome.trim().length > 0
          ? ev.outcome.trim()
          : null;

      const marketText =
        baseTitle && outcomeLabel
          ? `${baseTitle} · ${outcomeLabel}`
          : baseTitle || "Unknown Polymarket market";

      const side: "BUY" | "SELL" =
        ev.side === "SELL" ? "SELL" : "BUY";

      allTrades.push({
        id: `${wallet.address}-${ev.timestamp}-${marketText}-${side}-${ev.usdcSize}`,
        address: wallet.address,
        label: wallet.label,
        emoji: wallet.emoji,
        market: marketText,
        side,
        sizeUsd: ev.usdcSize,
        timestamp: ev.timestamp,
      });
    }
  }

  // En yeni işlem yukarıda
  allTrades.sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json(allTrades);
}