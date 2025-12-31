// lib/scoring.ts

// Market confidence (0-100) hesaplayıcı
export function computeConfidence(
  liquidityUsd: number,
  volume24hUsd: number,
  volatility: number
): number {
  const liqScore = Math.min(liquidityUsd / 50000, 1); // 50k'ya kadar 0-1
  const volScore = Math.min(volume24hUsd / 100000, 1); // 100k'ya kadar 0-1

  const volPenalty = Math.min(volatility * 5, 1); // 0..0.2 vol -> 0..1 ceza
  const base = liqScore * 0.5 + volScore * 0.5; // 0..1
  const final = base * (1 - 0.5 * volPenalty); // volatiliteden ceza

  return Math.round(final * 100); // 0..100
}

// Bugün ne yapalım mantığı
export function getTodayAction(
  whaleIndex: number,
  avgConfidence: number,
  avgVolatility: number
): { label: string; description: string } {
  if (avgVolatility > 0.18 && whaleIndex > 70) {
    return {
      label: "Dikkatli agresif",
      description:
        "Balinalar çok aktif, volatilite yüksek. Sadece en güvendiğin fikirlere küçük ama agresif girişler mantıklı."
    };
  }

  if (avgConfidence > 70 && whaleIndex >= 40 && avgVolatility < 0.12) {
    return {
      label: "Hafif risk alınabilir",
      description:
        "Marketler derin ve nispeten net, balinalar orta seviyede aktif. Güvendiğin 1-2 markete odaklanmak için uygun bir gün."
    };
  }

  if (avgConfidence < 50 && whaleIndex < 30) {
    return {
      label: "Bekleme modu",
      description:
        "Güven düşük, balinalar sessiz. Bugün yeni pozisyon açmak yerine izlemek ve not almak daha mantıklı."
    };
  }

  return {
    label: "Nötr",
    description:
      "Sinyaller karışık. Pozisyon boyutlarını küçük tut, farklı senaryoları test et, tek bir fikre yüklenme."
  };
}