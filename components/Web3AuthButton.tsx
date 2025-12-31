// components/Web3AuthButton.tsx
"use client";

import { useWeb3Auth } from "./Web3AuthProvider";

function shorten(addr: string | null) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function Web3AuthButton() {
  const { loading, ready, error, connected, address, user, connect, logout } =
    useWeb3Auth();

  // Init aşaması
  if (loading && !connected) {
    return (
      <div className="h-8 w-28 animate-pulse rounded-full bg-slate-800/60" />
    );
  }

  // Web3Auth init olamadıysa
  if (!ready && error) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-200"
        title={error}
        disabled
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        <span>Web3Auth error</span>
      </button>
    );
  }

  // Henüz hazır değil ama hata da yoksa
  if (!ready && !connected) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        <span>Initializing…</span>
      </div>
    );
  }

  // Henüz bağlanmamış kullanıcı
  if (!connected) {
    return (
      <button
        type="button"
        onClick={connect}
        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-emerald-400 hover:text-emerald-200"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span>Connect</span>
      </button>
    );
  }

  // Bağlı durum
  const displayName =
    user?.name ||
    user?.email ||
    (address ? shorten(address) : "Connected wallet");

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.45)]">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[11px]">
        {displayName.charAt(0).toUpperCase()}
      </span>
      <span className="max-w-[110px] truncate">{displayName}</span>
      <button
        type="button"
        onClick={logout}
        className="ml-1 text-[11px] text-emerald-200/80 hover:text-rose-300"
      >
        Disconnect
      </button>
    </div>
  );
}