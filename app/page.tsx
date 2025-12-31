// app/page.tsx
import TradingWorkspace from "@/components/TradingWorkspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05030B] text-slate-50">
      {/* Arka plan glow + grid */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-orange-500/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.06),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-10 pt-24">

        {/* HERO */}
        <section className="mt-12 mb-8 space-y-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-black/70 px-3 py-1 text-[11px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>AI-powered overlay for Polymarket traders</span>
          </div>

          <h1 className="text-[28px] md:text-[34px] lg:text-[40px] font-semibold tracking-tight leading-tight">
            One place to{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300 bg-clip-text text-transparent">
              talk, track &amp; time
            </span>{" "}
            your Polymarket trades.
          </h1>

          <p className="max-w-xl text-[13px] md:text-[15px] leading-relaxed text-slate-400">
            AI chatbot on the left, live whale feed above $5,000 on the right. Connect your wallet, drop event links; Polylook transforms signals into readable streams and cards for you.
          </p>
        </section>

        {/* WORKSPACE (client component, auto-refresh) */}
        <TradingWorkspace />
      </div>
    </main>
  );
}