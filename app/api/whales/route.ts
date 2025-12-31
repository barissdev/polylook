// app/api/whales/route.ts
import { NextResponse } from "next/server";

const POLYMARKET_TRADES_URL = "https://data-api.polymarket.com/trades";

const THRESHOLD_USD = 5000;
const WINDOW_MINUTES = 60;

type PolymarketTrade = {
  proxyWallet?: string;
  side: "BUY" | "SELL";
  asset?: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number; // unix (saniye)
  title?: string;
  slug?: string;
  eventSlug?: string;
  outcome?: string;
  outcomeIndex?: number;
  transactionHash?: string;
};

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

export async function GET() {
  try {
    const url = new URL(POLYMARKET_TRADES_URL);

    url.searchParams.set("limit", "200");
    url.searchParams.set("offset", "0");
    url.searchParams.set("takerOnly", "true");
    url.searchParams.set("filterType", "CASH");
    url.searchParams.set("filterAmount", THRESHOLD_USD.toString());

    const res = await fetch(url.toString(), { cache: "no-store" });

    if (!res.ok) {
      console.error("Polymarket API error:", res.status, await res.text());
      return NextResponse.json(
        { error: "Polymarket trades alınamadı" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as PolymarketTrade[];

    const whales: (WhaleTrade & { _tsMs: number })[] = data
      .map((t) => {
        const amountUsd = (t.size || 0) * (t.price || 0);

        let side: "yes" | "no" = "yes";
        const outcomeLower = (t.outcome || "").toLowerCase();
        if (outcomeLower.includes("no")) side = "no";
        else if (outcomeLower.includes("yes")) side = "yes";
        else if (t.side === "SELL") side = "no";

        const tsMs = (t.timestamp || 0) * 1000;

        const slug =
          t.eventSlug || t.slug || t.title?.toLowerCase().replace(/\s+/g, "-");
        const url = slug ? `https://polymarket.com/event/${slug}` : undefined;

        return {
          marketId: t.conditionId,
          marketQuestion:
            t.title || t.slug || t.eventSlug || "Unknown market",
          side,
          amountUsd,
          price: t.price || 0,
          timestamp: new Date(tsMs).toISOString(),
          url,
          _tsMs: tsMs,
        };
      })
      .filter((w) => w.amountUsd >= THRESHOLD_USD)
      .sort((a, b) => b._tsMs - a._tsMs)
      .slice(0, 100);

    const response: WhaleResponse = {
      windowMinutes: WINDOW_MINUTES,
      thresholdUsd: THRESHOLD_USD,
      whales: whales.map(({ _tsMs, ...rest }) => rest),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Whales API route error:", err);
    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}