import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  if (!user) redirect("/auth");

  await supabase
    .from("users")
    .update({ has_seen_welcome: true })
    .eq("id", user.id);

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const rawName =
    profile?.username ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "there";

  const name = String(rawName).split(" ")[0];

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="text-5xl font-black leading-none tracking-tight md:text-7xl">
          Hey {name} 👋
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600 md:text-lg">
          Your account is ready. Discover events, deals, local updates and the
          best bits happening across East Lothian.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-black text-white transition hover:opacity-85"
          >
            Explore East Lothian
            <ArrowRight size={18} />
          </Link>

          <Link
            href="/create-page"
            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-4 text-sm font-black text-black transition hover:bg-neutral-100"
          >
            Create a page
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-neutral-100 bg-neutral-50 p-5">
          <MapPin className="mb-4 text-emerald-700" size={26} />

          <h2 className="font-black">Local first</h2>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Discover things happening nearby without scrolling endless noisy
            feeds.
          </p>
        </div>

        <div className="rounded-[2rem] border border-neutral-100 bg-neutral-50 p-5">
          <CalendarDays className="mb-4 text-emerald-700" size={26} />

          <h2 className="font-black">Plan your week</h2>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Save events, find deals and keep track of what’s coming up across
            East Lothian.
          </p>
        </div>

        <div className="rounded-[2rem] border border-neutral-100 bg-neutral-50 p-5">
          <Building2 className="mb-4 text-emerald-700" size={26} />

          <h2 className="font-black">Support locals</h2>

          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Follow businesses, clubs, organisations and services doing brilliant
            things locally.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-[2rem] bg-emerald-800 p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-100/70">
          Looking to make a page?
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight">
          Put your local thing on the map.
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
          Businesses, clubs, organisations and services can create pages to
          share updates, events, deals, opening hours and contact details.
        </p>

        <Link
          href="/create-page"
          className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-900"
        >
          Create your page
        </Link>
      </section>
    </main>
  );
}