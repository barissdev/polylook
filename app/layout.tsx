// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/TopBar";
import { Web3AuthProvider } from "@/components/Web3AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Polylook",
  description: "Polylook – Polymarket companion",
  icons: {
    icon: "/favicon.png",       // 👈 ICO favicon
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="overflow-y-scroll">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Web3AuthProvider>
          {/* background */}
          <div className="pointer-events-none fixed inset-0 opacity-50">
            <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/18 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-orange-500/18 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.06),_transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" />
          </div>

          {/* Top nav */}
          <header className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <TopBar />
            </div>
          </header>

          {children}
        </Web3AuthProvider>
      </body>
    </html>
  );
}