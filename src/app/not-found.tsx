"use client";

import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-emerald-700 px-4 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_38%)]"
      />

      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
          <span className="text-3xl font-black tracking-tight">404</span>
        </div>

        <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-emerald-100">
          East Lothian Online
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Page not found
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-emerald-50/85 sm:text-lg">
          This page may have moved, been removed, or the link may be incorrect.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-emerald-800 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            <Home className="h-4 w-4" />
            Back home
          </Link>

          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            <Search className="h-4 w-4" />
            Search East Lothian
          </Link>
        </div>

        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to East Lothian Online
        </Link>
      </div>
    </main>
  );
}