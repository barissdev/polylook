// app/api/wallets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DB'deki satır tipi
type WalletRow = {
  id: string;
  address: string;
  label: string;
  emoji: string;
  active: boolean;
  user_email: string;
  created_at: string;
};

// Frontend'den gelen payload tipi (user_email hariç)
export type WalletPayload = {
  id: string;
  address: string;
  label: string;
  emoji: string;
  active: boolean;
};

/**
 * GET /api/wallets?email=foo@bar.com
 * -> Kullanıcının kayıtlı wallet chip'lerini döner
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ wallets: [] });
  }

  // Neon örneklerindeki gibi: db<WalletRow[]>`...`
// Generic yok, sonuç sonradan cast ediliyor
const rows = (await db`
  SELECT id, address, label, emoji, active, user_email, created_at
  FROM user_wallets
  WHERE user_email = ${email}
  ORDER BY created_at ASC
`) as WalletRow[];

  // Frontend'e sadece ihtiyacımız olan alanları gönderelim
  const wallets = rows.map((row) => ({
    id: row.id,
    address: row.address,
    label: row.label,
    emoji: row.emoji,
    active: row.active,
  }));

  return NextResponse.json({ wallets });
}

/**
 * POST /api/wallets
 * Body: { email: string, wallets: WalletPayload[] }
 * -> O kullanıcının tüm wallet listesini DB'de replace eder (basit MVP)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, wallets } = body as {
    email: string;
    wallets: WalletPayload[];
  };

  if (!email || !Array.isArray(wallets)) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  // Önce kullanıcının eski kayıtlarını sil
  await db`
    DELETE FROM user_wallets
    WHERE user_email = ${email}
  `;

  // Yeni wallet'ları teker teker ekle (MVP için gayet yeterli)
  for (const w of wallets) {
    await db`
      INSERT INTO user_wallets (id, user_email, address, label, emoji, active)
      VALUES (${w.id}, ${email}, ${w.address}, ${w.label}, ${w.emoji}, ${w.active})
    `;
  }

  return NextResponse.json({ ok: true });
}