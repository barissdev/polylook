// app/wallet-tracker/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import { useWeb3Auth } from "@/components/Web3AuthProvider";

type TrackedWallet = {
  id: string;
  address: string;
  label: string;
  emoji: string;
  active: boolean;
};

type FeedTrade = {
  id: string;
  address: string;
  label: string;
  emoji: string;
  market: string;
  side: "BUY" | "SELL";
  sizeUsd: number;
  timestamp: number;
};

const BASE_LS_KEY = "polylook_wallets_v2";

function createId() {
  return Math.random().toString(36).slice(2);
}

const emojiOptions = ["🧠", "🐋", "📈", "🦈", "🤖", "🧪", "🧿", "🏹"];

// ---- STORAGE KEY HELPERS ----
function getStorageKey(email: string | null | undefined, connected: boolean) {
  if (connected && email) {
    return `${BASE_LS_KEY}_user_${email.toLowerCase()}`;
  }
  return `${BASE_LS_KEY}_guest`;
}

function loadWalletsFromStorage(storageKey: string): TrackedWallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrackedWallet[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveWalletsToStorage(storageKey: string, wallets: TrackedWallet[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(wallets));
  } catch {
    // ignore
  }
}

const formatUsd = (n: number) =>
  "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function WalletTrackerPage() {
  const { connected, user } = useWeb3Auth();

  // ❗ Kullanıcı durumuna göre key (guest vs user)
  const storageKey = useMemo(
    () => getStorageKey(user?.email, connected),
    [user?.email, connected]
  );

  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [feed, setFeed] = useState<FeedTrade[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // server sync state
  const [serverLoaded, setServerLoaded] = useState(false);
  const [serverSyncing, setServerSyncing] = useState(false);

  // New wallet form
  const [newEmoji, setNewEmoji] = useState("🧠");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("Me");
  const [newAddress, setNewAddress] = useState("");

  // İlk load -> o anki storageKey'den çek (guest ya da user)
  useEffect(() => {
    const initial = loadWalletsFromStorage(storageKey);
    setWallets(initial);
  }, [storageKey]);

  // Wallet değişince o anki storageKey'e yaz
  useEffect(() => {
    saveWalletsToStorage(storageKey, wallets);
  }, [wallets, storageKey]);

  const activeWallets = useMemo(
    () =>
      wallets.filter(
        (w) => w.active && /^0x[a-fA-F0-9]{40}$/.test(w.address.trim())
      ),
    [wallets]
  );

  // 🔄 DB'den wallet listesi çek (login varsa)
  useEffect(() => {
    if (!connected || !user?.email) {
      setServerLoaded(false);
      return;
    }

    let abort = false;

    async function loadFromServer() {
      try {
        setServerSyncing(true);
        const res = await fetch(
          `/api/wallets?email=${encodeURIComponent(user.email)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          console.error("wallets GET error:", await res.text());
          return;
        }
        const data = (await res.json()) as { wallets?: TrackedWallet[] };

        // Eğer DB'de kayıt varsa local state + localStorage user-key güncellensin
        if (!abort && data.wallets && data.wallets.length) {
          setWallets(data.wallets);
        }
      } catch (err) {
        console.error("wallets GET error:", err);
      } finally {
        if (!abort) {
          setServerLoaded(true);
          setServerSyncing(false);
        }
      }
    }

    loadFromServer();
    return () => {
      abort = true;
    };
  }, [connected, user?.email]);

  // Wallet listesi değişince DB'ye kaydet (login + serverLoaded ise)
  useEffect(() => {
    if (!connected || !user?.email || !serverLoaded) return;
    if (!wallets) return;

    let abort = false;

    async function saveToServer() {
      try {
        setServerSyncing(true);
        await fetch("/api/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            wallets,
          }),
        });
      } catch (err) {
        console.error("wallets POST error:", err);
      } finally {
        if (!abort) setServerSyncing(false);
      }
    }

    saveToServer();
    return () => {
      abort = true;
    };
  }, [wallets, connected, user?.email, serverLoaded]);

  // 📡 Feed fetch + polling (aktif wallet'lar)
  useEffect(() => {
    if (activeWallets.length === 0) {
      setFeed([]);
      return;
    }

    let abort = false;

    async function loadFeed() {
      setLoadingFeed(true);
      try {
        const res = await fetch("/api/wallet-feed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wallets: activeWallets.map((w) => ({
              address: w.address,
              label: w.label,
              emoji: w.emoji,
            })),
          }),
        });

        if (!res.ok) {
          console.error("wallet-feed error:", await res.text());
          if (!abort) setFeed([]);
          return;
        }

        const data = (await res.json()) as FeedTrade[];

        if (!abort && Array.isArray(data)) {
          setFeed(data);
        }
      } catch (err) {
        console.error("wallet-feed error:", err);
        if (!abort) setFeed([]);
      } finally {
        if (!abort) setLoadingFeed(false);
      }
    }

    loadFeed();
    const interval = setInterval(loadFeed, 30_000);

    return () => {
      abort = true;
      clearInterval(interval);
    };
  }, [activeWallets]);

  const handleAddWallet = (e: FormEvent) => {
    e.preventDefault();

    const address = newAddress.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      alert("Please enter a valid 0x wallet address.");
      return;
    }

    const wallet: TrackedWallet = {
      id: createId(),
      address: address.toLowerCase(),
      label: newLabel.trim() || "Wallet",
      emoji: newEmoji.trim() || "🧠",
      active: true,
    };

    setWallets((prev) => [...prev, wallet]);
    setNewAddress("");
  };

  const toggleWalletActive = (id: string) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w))
    );
  };

  const removeWallet = (id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#05030B] text-slate-50">
      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-10 pt-24">
        {/* HERO */}
        <section className="mt-12 mb-8 space-y-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-black/70 px-3 py-1 text-[11px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Wallet tracker</span>
            {connected && user?.email && (
              <span className="ml-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400">
                Synced as <span className="font-mono">{user.email}</span>
              </span>
            )}
          </div>

          <h1 className="text-[28px] md:text-[34px] lg:text-[40px] font-semibold tracking-tight leading-tight">
            Multi-wallet{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300 bg-clip-text text-transparent">
              live feed
            </span>{" "}
            for Polymarket.
          </h1>

          <p className="max-w-xl text-[13px] md:text-[15px] leading-relaxed text-slate-400">
            Add any wallets you want, give each one an emoji and name, and
            watch their latest trades in a live feed. Guest wallets and signed-in
            wallets are kept separate for each user.
          </p>
        </section>

        {/* Wallet management */}
        <section className="space-y-4">
          {/* Add wallet form */}
          <form
            onSubmit={handleAddWallet}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 md:flex-row md:items-center"
          >
            {/* Emoji picker */}
            <div className="relative flex items-center gap-2 md:w-[120px]">
              <span className="text-xs text-slate-400">Emoji</span>
              <button
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm hover:border-slate-400"
              >
                <span className="text-lg">{newEmoji}</span>
                <span className="text-[10px] text-slate-500">Change</span>
              </button>

              {emojiOpen && (
                <div className="absolute left-14 top-8 z-20 flex gap-1 rounded-xl border border-slate-700 bg-slate-900/95 px-2 py-1 shadow-xl">
                  {emojiOptions.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => {
                        setNewEmoji(emo);
                        setEmojiOpen(false);
                      }}
                      className="px-1 py-1 text-xl hover:scale-110 transition-transform"
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex flex-1 items-center gap-2">
              <span className="text-xs text-slate-400">Name</span>
              <input
                type="text"
                value={newLabel}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setNewLabel(e.target.value)
                }
                placeholder="e.g. Me, Whale 1, Friend"
                className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Address */}
            <div className="flex flex-1 items-center gap-2">
              <span className="text-xs text-slate-400">Address</span>
              <input
                type="text"
                value={newAddress}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setNewAddress(e.target.value)
                }
                placeholder="0x... Polymarket wallet address"
                className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Add wallet
            </button>
          </form>

          {/* Wallet chips */}
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => toggleWalletActive(w.id)}
                className={
                  "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all " +
                  (w.active
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500")
                }
              >
                <span className="text-base">{w.emoji}</span>
                <span className="font-medium">{w.label}</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {w.address.slice(0, 6)}…{w.address.slice(-4)}
                </span>
                <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400 group-hover:bg-slate-700">
                  {w.active ? "ON" : "OFF"}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWallet(w.id);
                  }}
                  className="ml-1 cursor-pointer text-[10px] text-slate-500 hover:text-rose-400"
                >
                  ✕
                </span>
              </button>
            ))}

            {wallets.length === 0 && (
              <span className="text-xs text-slate-500">
                No wallets added yet. Start by adding one above.
              </span>
            )}
          </div>
        </section>

        {/* Live feed */}
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-100">
                Live trade feed
              </h2>
              <p className="text-xs text-slate-500">
                Latest trades from active wallets. Most recent trades appear at
                the top.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span>Auto refresh · 30s</span>
              </span>
              {loadingFeed && <span>Updating…</span>}
              {serverSyncing && (
                <span className="text-[10px] text-slate-500">
                  Syncing wallets…
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80 scroll-shell">
            {feed.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No trades found in the last hour for active wallets, or no
                wallets selected yet.
              </div>
            )}

            <ul className="divide-y divide-slate-800/80">
              {feed.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-900/70"
                >
                  {/* Avatar */}
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/90">
                    <span className="text-lg">{t.emoji}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100">
                          {t.label}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {t.address.slice(0, 6)}…{t.address.slice(-4)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {formatTime(t.timestamp)}
                      </span>
                    </div>

                    <p className="text-[13px] text-slate-100 line-clamp-2">
                      {t.market}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold " +
                          (t.side === "BUY"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-rose-500/10 text-rose-300")
                        }
                      >
                        {t.side} · {formatUsd(t.sizeUsd)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}