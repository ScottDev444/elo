import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Crown,
  Search,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import BecomePartnerButton from "@/components/BecomePartnerButton";

export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: page } = await supabase
    .from("groups")
    .select("id, name, status")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!page) redirect("/");

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
          <Crown size={16} />
          Local Partner
        </div>

        <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-black md:text-7xl">
          Know what locals want before you post.
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-9 text-neutral-700">
          Local Partners get insight from ELO search and recommendations —
          showing what people across East Lothian are trying to find, book,
          buy, attend and discover.
        </p>

        <div className="mt-10 rounded-[2rem] border border-neutral-200 bg-neutral-50 p-8">
          <p className="text-lg font-semibold text-neutral-800">
            Turn local interest into better posts, offers and services.
          </p>

          <div className="mt-6 space-y-4 text-2xl font-black tracking-tight text-black">
            <p>
              ☕ People searching for dog friendly spots? Push your outdoor
              tables.
            </p>

            <p>
              🍰 More interest in birthday cakes? Post your custom orders.
            </p>

            <p>
              🎶 Locals looking for live music? Promote your Friday night event.
            </p>

            <p>
              🛠️ Searches rising for emergency repairs? Highlight same-day
              availability.
            </p>
          </div>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-600">
            It helps you decide what to promote, when to post it, and what
            people actually care about right now.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-neutral-200 p-6">
            <Search className="text-emerald-700" size={28} />

            <h2 className="mt-5 text-2xl font-black">
              Higher in search
            </h2>

            <p className="mt-3 leading-7 text-neutral-600">
              Local Partners appear higher across ELO search and discovery.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 p-6">
            <TrendingUp className="text-emerald-700" size={28} />

            <h2 className="mt-5 text-2xl font-black">
              Featured posts
            </h2>

            <p className="mt-3 leading-7 text-neutral-600">
              Your events, offers and updates can appear in featured sections at
              the top of ELO.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 p-6">
            <BadgeCheck className="text-emerald-700" size={28} />

            <h2 className="mt-5 text-2xl font-black">
              Partner badge
            </h2>

            <p className="mt-3 leading-7 text-neutral-600">
              A clear badge across your page and posts showing you support East
              Lothian’s own platform.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] bg-emerald-50 p-8">
          <p className="max-w-3xl text-lg leading-8 text-neutral-700">
            Local Partners help keep ELO clean, local and independent —
            supporting a platform built around East Lothian instead of intrusive
            ads, algorithms and cluttered feeds.
          </p>

          <BecomePartnerButton />
        </div>
      </section>
    </main>
  );
}