"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type UserRow = {
  username: string | null;
};

export default function SiteHeader() {
  const [locationOpen, setLocationOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadAccount() {
      setAuthLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (authError || !user) {
        setSignedIn(false);
        setUsername(null);
        setAuthLoading(false);
        return;
      }

      setSignedIn(true);

      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single<UserRow>();

      if (!active) {
        return;
      }

      if (error) {
        console.error("Could not load public.users username:", error);
        setUsername("Your account");
      } else {
        setUsername(data.username?.trim() || "Your account");
      }

      setAuthLoading(false);
    }

    void loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAccount();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Home"
        >
          <Image
            src="/logo-new.png"
            alt="ELO Logo"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
          />

          <div className="hidden leading-tight sm:block">
            <p className="text-base font-bold text-slate-900">
              East Lothian Online
            </p>

            <p className="text-xs text-slate-500">
              Your Community&apos;s Digital Home
            </p>
          </div>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={() => setLocationOpen((open) => !open)}
            aria-expanded={locationOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-700 transition hover:text-slate-950"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            <span>Connected to East Lothian</span>

            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${
                locationOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {locationOpen && (
            <div
              role="menu"
              className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => setLocationOpen(false)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    East Lothian
                  </p>

                  <p className="text-xs text-slate-500">
                    Your current community
                  </p>
                </div>

                <Check className="h-4 w-4 text-emerald-600" />
              </button>

              <div className="mt-1 border-t border-slate-100 px-3 py-2.5">
                <p className="text-xs font-medium text-slate-500">
                  More communities coming soon 👀
                </p>
              </div>
            </div>
          )}
        </div>

        {authLoading ? (
          <div className="flex h-10 min-w-24 items-center justify-center">
            <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" />
          </div>
        ) : signedIn ? (
          <Link
            href="/account"
            className="group flex min-w-0 items-center gap-2"
            title={`Signed in as ${username ?? "Your account"}`}
          >
            <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-700 transition group-hover:text-emerald-700 sm:block">
              {username ?? "Your account"}
            </span>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white transition group-hover:bg-emerald-800">
              <UserRound className="h-4.5 w-4.5" />
            </span>
          </Link>
        ) : (
          <Link
            href="/log-in"
            className="rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Log In
          </Link>
        )}
      </div>
    </header>
  );
}