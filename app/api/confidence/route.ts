// app/api/confidence/route.ts
import { NextResponse } from "next/server";
import { computeConfidence } from "@/lib/scoring";

type ConfidenceMarket = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  liquidityUsd: number;
  volume24hUsd: number;
  volatility24h: number;
  confidence: number; // 0-100
};

type ConfidenceResponse = {
  markets: ConfidenceMarket[];
};

export async function GET() {
  // Şimdilik sahte (mock) market verileri
  const raw = [
    {
      id: "btc-100k-2025",
      question: "Will BTC reach $100k in 2025?",
      yesPrice: 0.44,
      noPrice: 0.56,
      liquidityUsd: 78000,
      volume24hUsd: 130000,
      volatility24h: 0.07
    },
    {
      id: "trump-win",
      question: "Will Trump win the election?",
      yesPrice: 0.61,
      noPrice: 0.39,
      liquidityUsd: 52000,
      volume24hUsd: 80000,
      volatility24h: 0.12
    },
    {
      id: "eth-etf",
      question: "Will an ETH ETF be approved?",
      yesPrice: 0.53,
      noPrice: 0.47,
      liquidityUsd: 30000,
      volume24hUsd: 45000,
      volatility24h: 0.05
    }
  ];

  const markets: ConfidenceMarket[] = raw.map((m) => ({
    ...m,
    confidence: computeConfidence(
      m.liquidityUsd,
      m.volume24hUsd,
      m.volatility24h
    )
  }));

  const response: ConfidenceResponse = { markets };

  return NextResponse.json(response);
}