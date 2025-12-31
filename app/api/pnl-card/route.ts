// app/api/pnl-card/route.ts
import { NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";

type PositionRow = {
  currentValue?: number;
  cashPnl?: number;
  realizedPnl?: number;
};

type ClosedPositionRow = {
  realizedPnl?: number;
};

type TradeRow = {
  size?: number;
  price?: number;
  timestamp?: number; // unix seconds
};

type LeaderboardEntry = {
  proxyWallet: string;
  pnl?: number;
  vol?: number;
};

type PnlCardSummary = {
  address: string;
  realizedPnlUsd: number; // all-time PnL (leaderboard var ise ondan)
  openPnlUsd: number;     // açık pozisyonlardaki PnL
  volumeUsd: number;      // seçilen gün sayısındaki hacim
  tradesCount: number;    // seçilen gün sayısındaki trade sayısı
  winRate: number;        // kapalı pozisyonlarda kazanma oranı
  firstTradeTs: number | null;
  lastTradeTs: number | null;
  profileLabel: string;
};

function safeNum(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  return 0;
}

// Basit, güvenli fetch
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

// closed-positions endpoint'i için sayfalama
async function fetchAllClosedPositions(user: string): Promise<ClosedPositionRow[]> {
  const all: ClosedPositionRow[] = [];
  const limit = 50;
  let offset = 0;

  for (let i = 0; i < 10; i++) {
    const chunk = await safeJson<ClosedPositionRow[]>(
      `${DATA_API_BASE}/closed-positions?user=${user}&limit=${limit}&offset=${offset}`
    );
    if (!chunk || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }

  return all;
}

function buildProfileLabel(summary: {
  realizedPnlUsd: number;
  winRate: number;
  tradesCount: number;
  volumeUsd: number;
}): string {
  const { realizedPnlUsd, winRate, tradesCount, volumeUsd } = summary;

  if (tradesCount < 10 || volumeUsd < 500) {
    return "New Polymarket explorer";
  }

  if (realizedPnlUsd > 0 && winRate >= 55 && volumeUsd > 5000) {
    return "Disiplinli kârlı trader";
  }

  if (realizedPnlUsd < 0 && volumeUsd > 5000) {
    return "Aggro degen (yüksek risk, yüksek hacim)";
  }

  if (winRate >= 60) {
    return "İstikrarlı yüksek isabet oranı";
  }

  return "Aktif Polymarket power user";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.address !== "string") {
    return NextResponse.json(
      { error: "address is required in body" },
      { status: 400 }
    );
  }

  const addressRaw: string = body.address.trim().toLowerCase();
  const daysRaw: number = typeof body.days === "number" ? body.days : 30;
  // gün sayısını 1–3650 arası sıkıştıralım
  const days = Math.min(Math.max(daysRaw, 1), 3650);

  if (!/^0x[a-f0-9]{40}$/.test(addressRaw)) {
    return NextResponse.json(
      { error: "invalid address format (expected 0x + 40 hex chars)" },
      { status: 400 }
    );
  }

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const since = nowSec - days * 24 * 60 * 60;

    // 1) Pozisyonlar (openPnL + equity + realized'ın bir kısmı)
    const positions =
      (await safeJson<PositionRow[]>(
        `${DATA_API_BASE}/positions?user=${addressRaw}&limit=200&sortBy=CURRENT&sortDirection=DESC`
      )) || [];

    // 2) Kapalı pozisyonlar (realized & win rate için)
    const closedPositions = await fetchAllClosedPositions(addressRaw);

    // 3) Leaderboard (all-time PnL)
    const leaderboard =
      (await safeJson<LeaderboardEntry[]>(
        `${DATA_API_BASE}/v1/leaderboard?user=${addressRaw}&category=OVERALL&timePeriod=ALL&orderBy=PNL&limit=1`
      )) || [];

    // 4) Trades (seçilen gün sayısı için volume + trade sayısı)
    const trades =
      (await safeJson<TradeRow[]>(
        `${DATA_API_BASE}/trades?user=${addressRaw}&from=${since}&limit=500&sortBy=TIMESTAMP&sortDirection=DESC`
      )) || [];

    // ---- Open PnL & equity ----
    let openPnlUsd = 0;
    for (const p of positions) {
      openPnlUsd += safeNum(p.cashPnl);
    }

    // ---- Realized PnL (open + closed) ----
    let realizedFromOpen = 0;
    for (const p of positions) {
      realizedFromOpen += safeNum(p.realizedPnl);
    }

    let realizedFromClosed = 0;
    for (const p of closedPositions) {
      realizedFromClosed += safeNum(p.realizedPnl);
    }

    const realizedCombined = realizedFromOpen + realizedFromClosed;

    // Leaderboard ALL-time PnL varsa onu kullan, yoksa combined
    const lbEntry = leaderboard[0];
    const leaderboardPnl =
      lbEntry && typeof lbEntry.pnl === "number" ? lbEntry.pnl : null;
    const realizedPnlUsd =
      leaderboardPnl !== null ? leaderboardPnl : realizedCombined;

    // ---- Win rate: sadece kapalı pozisyonlar ----
    let wins = 0;
    let losses = 0;
    for (const p of closedPositions) {
      const r = safeNum(p.realizedPnl);
      if (r > 0) wins += 1;
      else if (r < 0) losses += 1;
    }
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;

    // ---- Trades: seçilen zaman aralığı için volume + trade sayısı ----
    let volumeUsd = 0;
    let firstTradeTs: number | null = null;
    let lastTradeTs: number | null = null;

    for (const t of trades) {
      const size = safeNum(t.size);
      const price = safeNum(t.price);
      const ts = safeNum(t.timestamp);

      if (ts <= 0 || ts < since) continue;

      // kabaca trade hacmi
      volumeUsd += Math.abs(size * price);

      if (firstTradeTs === null || ts < firstTradeTs) firstTradeTs = ts;
      if (lastTradeTs === null || ts > lastTradeTs) lastTradeTs = ts;
    }

    const tradesCount = trades.filter(
      (t) => safeNum(t.timestamp) >= since
    ).length;

    const summary: PnlCardSummary = {
      address: addressRaw,
      realizedPnlUsd,
      openPnlUsd,
      volumeUsd,
      tradesCount,
      winRate,
      firstTradeTs,
      lastTradeTs,
      profileLabel: buildProfileLabel({
        realizedPnlUsd,
        winRate,
        tradesCount,
        volumeUsd,
      }),
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("pnl-card API error:", err);
    return NextResponse.json(
      { error: "Failed to generate PnL card" },
      { status: 500 }
    );
  }
}