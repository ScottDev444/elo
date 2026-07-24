"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-2xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <Link
  href="/"
  className="flex items-center gap-3"
  aria-label="Home"
>
  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[28px] leading-none">
    🌍
  </span>

  <div className="hidden sm:block leading-tight">
    <p className="text-base font-bold text-slate-900">Atlas Community</p>
    <p className="text-xs text-slate-500">The World in your Pocket</p>
  </div>
</Link>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Connected to
          </p>

          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            East Lothian
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500" />
          </button>

          <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}