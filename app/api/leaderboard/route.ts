// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";

const DATA_API_BASE = "https://data-api.polymarket.com";

// Frontend time tab -> Polymarket API timePeriod mapping
const FRONT_TIME_TO_API: Record<string, "DAY" | "WEEK" | "MONTH" | "ALL"> = {
  TODAY: "DAY",
  WEEKLY: "WEEK",
  MONTHLY: "MONTH",
  ALL: "ALL",
};

type LeaderboardRow = {
  proxyWallet: string;
  userName?: string;
  pnl?: number;
  vol?: number;
};

type LeaderboardRequest = {
  timePeriod?: "TODAY" | "WEEKLY" | "MONTHLY" | "ALL";
  metric?: "PNL" | "VOLUME";
  limit?: number;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}

async function safeJson<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    console.error("Polymarket leaderboard API error:", url, res.status);
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
  const body = (await req.json().catch(() => ({}))) as LeaderboardRequest;

  // FRONT (TODAY/WEEKLY/MONTHLY/ALL)  ->  API (DAY/WEEK/MONTH/ALL)
  const frontKey = body.timePeriod || "ALL";
  const apiTimePeriod = FRONT_TIME_TO_API[frontKey] ?? "ALL";

  // metric: PNL / VOLUME (frontend)  -> orderBy: PNL / VOL (API)
  const metric: "PNL" | "VOLUME" =
    body.metric === "VOLUME" ? "VOLUME" : "PNL";
  const orderBy = metric === "PNL" ? "PNL" : "VOL";

  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 200
      ? body.limit
      : 100;

  const query = buildQuery({
    category: "OVERALL",
    timePeriod: apiTimePeriod,
    orderBy,
    limit,
  });

  const url = `${DATA_API_BASE}/v1/leaderboard?${query}`;

  try {
    const rows = await safeJson<LeaderboardRow[]>(url);
    if (!rows) {
      return NextResponse.json(
        { error: "Failed to load leaderboard" },
        { status: 500 }
      );
    }

    const normalized = rows.map((row, idx) => ({
      rank: idx + 1,
      address: row.proxyWallet,
      name:
        row.userName && row.userName.trim().length > 0
          ? row.userName.trim()
          : `0x${row.proxyWallet.slice(2, 6)}…${row.proxyWallet.slice(-4)}`,
      pnlUsd: row.pnl ?? 0,
      volumeUsd: row.vol ?? 0,
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error("leaderboard route error:", err);
    return NextResponse.json(
      { error: "Leaderboard API error" },
      { status: 500 }
    );
  }
}