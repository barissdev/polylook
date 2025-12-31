// app/api/db-test/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db`SELECT NOW() as now`;
    return NextResponse.json({ ok: true, now: result[0].now });
  } catch (err) {
    console.error("[db-test] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}