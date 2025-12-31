// app/api/card/route.ts
import { NextResponse } from "next/server";

type CardData = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  confidence: number;
  whalesLast60m: number;
  url: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("market");

  if (!marketId) {
    return NextResponse.json(
      { error: "market parametresi gerekli. Örnek: /api/card?market=btc-100k-2025" },
      { status: 400 }
    );
  }

  // Şimdilik tamamen mock. İleride Polymarket + senin scorer'dan alacağız.
  let data: CardData;

  if (marketId === "btc-100k-2025") {
    data = {
      id: "btc-100k-2025",
      question: "Will BTC reach $100k in 2025?",
      yesPrice: 0.44,
      noPrice: 0.56,
      confidence: 82,
      whalesLast60m: 3,
      url: "https://polymarket.com/event/btc-100k-2025"
    };
  } else if (marketId === "trump-win") {
    data = {
      id: "trump-win",
      question: "Will Trump win the election?",
      yesPrice: 0.61,
      noPrice: 0.39,
      confidence: 75,
      whalesLast60m: 2,
      url: "https://polymarket.com/event/trump-win"
    };
  } else {
    // generic fallback
    data = {
      id: marketId,
      question: `Market: ${marketId}`,
      yesPrice: 0.5,
      noPrice: 0.5,
      confidence: 60,
      whalesLast60m: 1,
      url: `https://polymarket.com/event/${encodeURIComponent(marketId)}`
    };
  }

  return NextResponse.json(data);
}