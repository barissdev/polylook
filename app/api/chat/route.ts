// app/api/chat/route.ts
import { NextResponse } from "next/server";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

// -----------------------------
//  Polymarket link parsing
// -----------------------------
type LinkKind = "event" | "market" | "sports" | "unknown";

type PolyLink = {
  url: string;
  kind: LinkKind;
  slug?: string;
};

function extractPolymarketLinks(message: string): PolyLink[] {
  const links: PolyLink[] = [];
  const regex = /https?:\/\/(?:www\.)?polymarket\.com\/[^\s)]+/gi;

  const matches = message.match(regex);
  if (!matches) return [];

  for (const raw of matches) {
    const url = raw.trim();
    let kind: LinkKind = "unknown";
    let slug: string | undefined;

    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);

      if (parts[0] === "event") {
        kind = "event";
        slug = parts[1];
      } else if (parts[0] === "market") {
        kind = "market";
        slug = parts[1];
      } else if (parts[0] === "sports") {
        kind = "sports";
        slug = parts[1];
      }
    } catch {
      // URL parse edilemese bile ham halini saklıyoruz
    }

    links.push({ url, kind, slug });
  }

  return links.slice(0, 3);
}

// -----------------------------
//  Gamma API tipleri & helpers
// -----------------------------
type GammaMarket = {
  id: string;
  question?: string;
  slug?: string;
  outcomes?: any;
  outcomePrices?: any;
  liquidityNum?: number;
  volumeNum?: number;
  endDateIso?: string;
  startDateIso?: string;
  [key: string]: any;
};

type GammaEvent = {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  endDate?: string;
  startDate?: string;
  markets?: GammaMarket[];
  [key: string]: any;
};

function parseStringOrJson(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
        return [String(parsed)];
      } catch {
        // JSON değilse aşağıda virgülle böleceğiz
      }
    }
    return trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  }

  return [String(value)];
}

function extractYesNoPrices(market: GammaMarket) {
  const outcomes = parseStringOrJson(market.outcomes);
  const pricesRaw = parseStringOrJson(market.outcomePrices);

  if (!outcomes.length || !pricesRaw.length) return null;

  const prices = pricesRaw.map((p) => {
    const n = Number(p);
    return isFinite(n) ? n : NaN;
  });

  if (prices.some((p) => Number.isNaN(p))) return null;

  const lower = outcomes.map((o) => o.toLowerCase());
  let yesIndex = lower.findIndex((o) => o === "yes" || o === "y");
  let noIndex = lower.findIndex((o) => o === "no" || o === "n");

  // Eğer YES/NO yoksa ilk iki outcome'u 1 ve 2 olarak değerlendir
  if (yesIndex === -1 && noIndex === -1 && outcomes.length >= 2) {
    yesIndex = 0;
    noIndex = 1;
  }

  const yesPrice = yesIndex >= 0 ? prices[yesIndex] : undefined;
  const noPrice = noIndex >= 0 ? prices[noIndex] : undefined;

  if (yesPrice === undefined && noPrice === undefined) return null;

  return {
    yesLabel: yesIndex >= 0 ? outcomes[yesIndex] : "Outcome 1",
    noLabel: noIndex >= 0 ? outcomes[noIndex] : "Outcome 2",
    yesPrice,
    noPrice,
  };
}

async function fetchEventBySlug(slug: string): Promise<GammaEvent | null> {
  const res = await fetch(
    `${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return (await res.json()) as GammaEvent;
}

async function fetchMarketBySlug(slug: string): Promise<GammaMarket | null> {
  const res = await fetch(
    `${GAMMA_BASE}/markets?slug=${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as GammaMarket[];
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

async function resolveMarketFromLink(link: PolyLink): Promise<{
  market: GammaMarket | null;
  event: GammaEvent | null;
}> {
  if (!link.slug) return { market: null, event: null };

  if (link.kind === "market" || link.kind === "sports") {
    const market = await fetchMarketBySlug(link.slug);
    return { market, event: null };
  }

  if (link.kind === "event") {
    const event = await fetchEventBySlug(link.slug);
    if (!event) return { market: null, event: null };

    let market: GammaMarket | null = null;

    if (Array.isArray(event.markets) && event.markets.length > 0) {
      market = event.markets[0];
    } else if (event.slug) {
      market = await fetchMarketBySlug(event.slug);
    }

    return { market, event };
  }

  return { market: null, event: null };
}

async function buildMarketsSummary(links: PolyLink[]): Promise<string | null> {
  if (!links.length) return null;

  const lines: string[] = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const indexLabel = `Market #${i + 1}`;
    lines.push(`${indexLabel}`);
    lines.push(`URL: ${link.url}`);

    if (!link.slug) {
      lines.push("Detail: slug not found");
      lines.push("");
      continue;
    }

    const { market, event } = await resolveMarketFromLink(link);

    if (!market && !event) {
      lines.push("Detail: market not found in Gamma API.");
      lines.push("");
      continue;
    }

    const title =
      market?.question || event?.title || link.slug || "Unknown market";

    lines.push(`Title: ${title}`);

    const yesNo = market ? extractYesNoPrices(market) : null;
    if (yesNo) {
      const yesProb =
        yesNo.yesPrice !== undefined ? yesNo.yesPrice * 100 : undefined;
      const noProb =
        yesNo.noPrice !== undefined ? yesNo.noPrice * 100 : undefined;

      if (yesProb !== undefined) {
        lines.push(
          `Probability (approx) - ${yesNo.yesLabel}: ${yesProb.toFixed(1)}%`
        );
      }
      if (noProb !== undefined) {
        lines.push(
          `Probability (approx) - ${yesNo.noLabel}: ${noProb.toFixed(1)}%`
        );
      }
    } else {
      lines.push(
        "Probability: YES/NO-like prices could not be extracted (may be spread or multi-outcome)."
      );
    }

    if (market?.liquidityNum !== undefined) {
      lines.push(`Liquidity: ~$${market.liquidityNum.toLocaleString()}`);
    }
    if (market?.volumeNum !== undefined) {
      lines.push(`Volume: ~$${market.volumeNum.toLocaleString()}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

// -----------------------------
//  Route handler (Groq)
// -----------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      const info =
        "GROQ_API_KEY is not defined. Add GROQ_API_KEY=... to .env.local and restart the dev server.";
      return NextResponse.json({ reply: info }, { status: 500 });
    }

    const links = extractPolymarketLinks(message);

    let marketsSummary: string | null = null;
    if (links.length > 0) {
      try {
        marketsSummary = await buildMarketsSummary(links);
      } catch (err) {
        console.error("Gamma summary error:", err);
      }
    }

const baseSystemPrompt = `
You are Polylook AI. Automatically classify the user's message:

1) If the message contains a Polymarket link:
   - RESPOND IN THE PREVIOUS STYLE:
   - Based on Gamma API data, analyze with clear headings like "possible outcomes, what the market is pricing,
     liquidity-risk status, volume flow, surprise scenarios".
   - Write clearly, concisely, trader-focused. No unnecessary soft sentences or long explanations.
   - Do not provide investment/betting advice.

2) If the message is a sports match question:
   - Detect matches like football / basketball (e.g., "Barcelona - Real Madrid").
   - Generate neutral predictions based on team form, style, squad dynamics, game plan.
   - You don't have to give a score, but you can share scenario / probability distribution.
   - Do not provide investment/betting advice.

3) If the message is none of the above:
   - Respond naturally to normal conversation / strategy / general Polymarket questions.

GENERAL RULES:
- Your responses must always be in English. If the user speaks Turkish, evaluate and respond only in English.
- Do not provide investment or betting advice.
- If numbers, probabilities, percentages are present, indicate they are approximate.
- Use a short, clear, modern tone.
Also, at the end of each message, state YOUR OWN POSITION:
- For YES/NO markets on Polymarket, give a clear statement like "My prediction: YES" or "My prediction: NO".
- If there are multiple outcomes, select the most logical outcome and state it clearly (e.g., "My position: X").
- For sports matches, choose one side or state the weighted result (e.g., "My prediction: Arsenal wins").
- This decision is an evaluative prediction, not advice. Always end with "⚠️ This is not investment/betting advice."
`.trim();

    const systemContent =
      baseSystemPrompt +
      (marketsSummary
        ? `\n\nMARKETS (Gamma özet datası):\n${marketsSummary}`
        : "");

    // --- Groq'a istek at ---
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.9,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: message },
          ],
        }),
      }
    );

    if (!groqRes.ok) {
      const text = await groqRes.text();
      console.error("Groq API error:", groqRes.status, text);
      return NextResponse.json(
        {
          reply:
            "I received an error from the model service (Groq). Please try again in a moment.",
        },
        { status: 500 }
      );
    }

    const data = await groqRes.json();

    const reply =
      data.choices?.[0]?.message?.content?.trim() ??
      "Could not generate a response, please try again in a moment.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
        reply:
          "I encountered an error on the backend. Please try again in a moment or ask about a different event / match.",
      },
      { status: 500 }
    );
  }
}