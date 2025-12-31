"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Web3AuthButton from "./Web3AuthButton";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Wallet Tracker", href: "/wallet-tracker" },
  { label: "PNL Card", href: "/pnl-card" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "New Markets", href: "/new-markets" },
];

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNav = (href: string) => {
    if (href !== pathname) router.push(href);
  };

  return (
    <div className="relative z-50 w-full flex flex-col items-center">
      <div className="pointer-events-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-slate-800/80 bg-black/80 px-5 py-3 shadow-[0_15px_60px_rgba(0,0,0,0.8)] backdrop-blur-md">

        {/* --- Logo + Title --- */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => router.push("/")}
        >
          <Image
            src="/favicon.png"
            alt="Polylook Logo"
            width={38}
            height={38}
            className="object-contain rounded-lg hover:scale-105 transition-all duration-200"
            priority
          />

          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-100">
              Polylook
            </span>
            <span className="text-[10px] text-slate-500">
              Polymarket workspace
            </span>
          </div>
        </div>

        {/* --- Ana Menü (desktop) --- */}
        <nav className="hidden md:flex items-center gap-3 text-[11px]">
          {navItems.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={
                  "rounded-full px-3.5 py-1.5 tracking-[0.14em] uppercase transition-all duration-200 " +
                  (active
                    ? "bg-slate-50 text-slate-900 font-medium shadow-[0_0_18px_rgba(255,255,255,0.4)]"
                    : "border border-slate-700/80 bg-black/40 text-slate-300 hover:border-slate-400 hover:text-white")
                }
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* --- Live + Auth Button --- */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300 pr-1">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            </span>
            <span className="uppercase tracking-[0.15em]">Live feed</span>
          </div>

          {/* Web3Auth Button */}
          <Web3AuthButton />
        </div>
      </div>

      {/* --- Mobil Menü --- */}
      <div className="mt-2 flex md:hidden justify-center gap-2 text-[10px] text-slate-400">
        {navItems.map(({ label, href }) => (
          <button
            key={href}
            onClick={() => handleNav(href)}
            className={
              "px-2 py-1 rounded-md transition " +
              (pathname === href
                ? "text-emerald-400 font-medium"
                : "text-slate-500 hover:text-white")
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}