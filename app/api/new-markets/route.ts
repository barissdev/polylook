// app/api/new-markets/route.ts
import { NextResponse } from "next/server";

type GammaEvent = {
  id: number;
  slug: string;
  title?: string;
  question?: string;
  createdAt: string;
  tags?: string[];
  tagSlugs?: string[];
  tag_labels?: string[];
  volume?: number;
  liquidity?: number;
};

type NewMarket = {
  id: number;
  slug: string;
  title: string;
  createdAt: string;
  volumeUsd: number;
  liquidityUsd: number;
};

// “Up / Down” olup olmadığını anlamaya çalışan helper
function isUpDownEvent(ev: GammaEvent): boolean {
  const text = (ev.title || ev.question || "").toLowerCase();

  // Başlıktan yakalamaya çalış
  if (
    text.includes("up or down") ||
    text.includes("up/down") ||
    text.includes("15 minute up") ||
    text.includes("15-minute up")
  ) {
    return true;
  }

  // Tag / label alanlarını toplayıp bak
  const tagStrings = [
    ...(ev.tags || []),
    ...(ev.tagSlugs || []),
    ...(ev.tag_labels || []),
  ]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  return tagStrings.some((t) =>
    t.includes("up/down") ||
    t.includes("up or down") ||
    t.includes("updown") ||
    t.includes("up-down")
  );
}

// Spor marketlerini filtrelemek istersen (istersen kapatabilirsin)
function isSportsEvent(ev: GammaEvent): boolean {
  const text = (ev.title || ev.question || "").toLowerCase();

  const tagStrings = [
    ...(ev.tags || []),
    ...(ev.tagSlugs || []),
    ...(ev.tag_labels || []),
  ]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  if (
    text.includes("nfl") ||
    text.includes("nba") ||
    text.includes("premier league")
  ) {
    return true;
  }

  return tagStrings.some((t) =>
    t.includes("sports") ||
    t.includes("football") ||
    t.includes("soccer")
  );
}

export async function GET() {
  try {
    const url = new URL("https://gamma-api.polymarket.com/events");
    url.searchParams.set("limit", "100");
    url.searchParams.set("order", "createdAt");
    url.searchParams.set("ascending", "false");
    url.searchParams.set("active", "true");
    url.searchParams.set("archived", "false");
    url.searchParams.set("closed", "false");

    const res = await fetch(url.toString(), {
      // 15 saniye cache; istersen ayarlarsın
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      console.error("Gamma events error:", await res.text());
      return NextResponse.json(
        { error: "Failed to load new markets from Gamma" },
        { status: 500 }
      );
    }

    const raw = await res.json();

    // 🔧 BURASI ÖNEMLİ: hem array hem { events: [] } şekline dayanıklı olsun
    let events: GammaEvent[] = [];
    if (Array.isArray(raw)) {
      events = raw as GammaEvent[];
    } else if (raw && Array.isArray((raw as any).events)) {
      events = (raw as any).events as GammaEvent[];
    } else {
      console.error("Unexpected Gamma events shape:", raw);
      return NextResponse.json(
        { error: "Unexpected Gamma events response shape" },
        { status: 500 }
      );
    }

    const nowMs = Date.now();
    const sixHoursMs = 6 * 60 * 60 * 1000;

    const filtered = events
      // son 6 saat (istersen 1 saate çekebilirsin)
      .filter((ev) => {
        const createdMs = Date.parse(ev.createdAt);
        return !Number.isNaN(createdMs) && nowMs - createdMs <= sixHoursMs;
      })
      // sporları at
      .filter((ev) => !isSportsEvent(ev))
      // up/down marketleri at
      .filter((ev) => !isUpDownEvent(ev))
      // en son 20 taneyi al
      .slice(0, 20);

    const data: NewMarket[] = filtered.map((ev) => ({
      id: ev.id,
      slug: ev.slug,
      title: ev.title || ev.question || `Event ${ev.id}`,
      createdAt: ev.createdAt,
      volumeUsd: ev.volume ?? 0,
      liquidityUsd: ev.liquidity ?? 0,
      url: ev.slug ? `https://polymarket.com/event/${ev.slug}` : `https://polymarket.com/event/${ev.id}`,
    }));

    return NextResponse.json({ markets: data });
  } catch (err) {
    console.error("new-markets route error:", err);
    return NextResponse.json(
      { error: "Unexpected error loading new markets" },
      { status: 500 }
    );
  }
}