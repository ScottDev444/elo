"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LoaderCircle,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type UserRow = {
  username: string | null;
};

export default function SiteHeader() {
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Go to homepage"
        >
          <Image
            src="/logo-new.png"
            alt="ELO Logo"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
          />

          <span className="text-lg font-black tracking-tight text-slate-900 sm:hidden">
            East Lothian Online
          </span>

          <div className="hidden leading-tight sm:block">
            <p className="text-base font-bold text-slate-900">
              East Lothian Online
            </p>

            <p className="text-xs text-slate-500">
              Your Community&apos;s Digital Home
            </p>
          </div>
        </Link>

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