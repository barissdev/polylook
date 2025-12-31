// app/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-[#05030B] text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-[12px] md:flex-row md:items-center md:justify-between">
        
        {/* Left */}
        <div className="flex flex-col gap-2 leading-tight">
          <span className="text-[11px] text-slate-500/80">
            © {new Date().getFullYear()} Polylook · All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link
              href="/terms"
              className="hover:text-slate-300 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-slate-300 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <span className="text-[11px]">Follow on</span>
          <a
            href="https://x.com/polylook"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-[11px] text-slate-300 hover:border-sky-500 hover:text-sky-300 transition"
          >
            𝕏 / @polylook
          </a>
        </div>
      </div>
    </footer>
  );
}