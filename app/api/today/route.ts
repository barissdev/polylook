// app/api/today/route.ts
import { NextResponse } from "next/server";
import { getTodayAction } from "@/lib/scoring";

type TodayResponse = {
  label: string;          // Kısa özet: "Hafif risk alınabilir"
  description: string;    // Daha uzun açıklama
  whaleIndex: number;     // 0-100 balina aktivitesi
  avgConfidence: number;  // 0-100 ortalama güven skoru
  avgVolatility: number;  // 0-1 arası (0.12 = %12)
};

export async function GET() {
  // Şimdilik mock değerler (sonra gerçek whale & confidence verilerinden hesaplanabilir)
  const whaleIndex = 58;
  const avgConfidence = 73;
  const avgVolatility = 0.11;

  const action = getTodayAction(whaleIndex, avgConfidence, avgVolatility);

  const response: TodayResponse = {
    ...action,
    whaleIndex,
    avgConfidence,
    avgVolatility
  };

  return NextResponse.json(response);
}