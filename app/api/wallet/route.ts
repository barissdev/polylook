// app/api/wallet/route.ts
import { NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";

type WalletSummary = {
  address: string;
  equityUsd: number;
  openPnlUsd: number;
  realizedPnlUsd: number;
  volume24hUsd: number;
  winRate: number;
  positionsOpen: number;
};

type PositionRow = {
  proxyWallet: string;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
};

type ActivityRow = {
  proxyWallet: string;
  timestamp: number;
  type?: string;
  usdcSize?: number;
};

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addressParam = url.searchParams.get("address");

  if (!addressParam) {
    return NextResponse.json(
      { error: "address query param required" },
      { status: 400 }
    );
  }

  const user = addressParam.toLowerCase();

  // Basit format kontrolü
  if (!/^0x[a-f0-9]{40}$/.test(user)) {
    return NextResponse.json(
      { error: "invalid address format (expected 0x + 40 hex chars)" },
      { status: 400 }
    );
  }

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const dayAgo = nowSec - 24 * 60 * 60;

    // 1) Tüm pozisyonlar
    const positionsData = await safeJson<PositionRow[]>(
      `${DATA_API_BASE}/positions?user=${encodeURIComponent(
        user
      )}&limit=500`
    );

    // 2) 24 saatlik volume için activity
    const activityData = await safeJson<ActivityRow[]>(
      `${DATA_API_BASE}/activity?user=${encodeURIComponent(
        user
      )}&limit=1000`
    );

    let equityUsd = 0;
    let openPnlUsd = 0;
    let realizedPnlUsd = 0;
    let positionsOpen = 0;
    let wins = 0;
    let closedWithRealized = 0;

    if (positionsData && Array.isArray(positionsData)) {
      positionsOpen = positionsData.length;

      for (const p of positionsData) {
        // currentValue = şu anki pozisyon değeri (token value)
        if (typeof p.currentValue === "number") {
          equityUsd += p.currentValue;
        }
        // cashPnl = unrealized (open) PnL
        if (typeof p.cashPnl === "number") {
          openPnlUsd += p.cashPnl;
        }
        // realizedPnl = kapanan kısımdan gelen PnL
        if (typeof p.realizedPnl === "number") {
          realizedPnlUsd += p.realizedPnl;
          if (p.realizedPnl !== 0) {
            closedWithRealized += 1;
            if (p.realizedPnl > 0) wins += 1;
          }
        }
      }
    }

    const winRate =
      closedWithRealized > 0
        ? Math.round((wins / closedWithRealized) * 100)
        : 0;

    // 24h volume (sadece TRADE ve usdcSize olan eventler)
    let volume24hUsd = 0;

    if (activityData && Array.isArray(activityData)) {
      for (const ev of activityData) {
        if (
          typeof ev.timestamp === "number" &&
          ev.timestamp >= dayAgo &&
          (ev.type === undefined || ev.type === "TRADE") &&
          typeof ev.usdcSize === "number"
        ) {
          volume24hUsd += ev.usdcSize;
        }
      }
    }

    const summary: WalletSummary = {
      address: user,
      equityUsd,
      openPnlUsd,
      realizedPnlUsd,
      volume24hUsd,
      winRate,
      positionsOpen,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Wallet summary API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch wallet summary from Polymarket" },
      { status: 500 }
    );
  }
}