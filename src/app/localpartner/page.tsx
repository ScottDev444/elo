"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Check,
  Headphones,
  LineChart,
  Megaphone,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type OwnedPage = {
  id: string;
  name: string;
  is_local_partner: boolean | null;
};

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

const benefits = [
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Access useful insights about how your Page is performing.",
  },
  {
    icon: LineChart,
    title: "Local trends",
    description:
      "See what people across East Lothian are searching for.",
  },
  {
    icon: Megaphone,
    title: "More post types",
    description:
      "Unlock extra ways to share useful updates with the community.",
  },
  {
    icon: ArrowUp,
    title: "Higher feed placement",
    description:
      "Local Partner posts are given greater visibility in the main feed.",
  },
  {
    icon: BadgeCheck,
    title: "Verified badge",
    description:
      "Show people that your Page is an official ELO Local Partner.",
  },
  {
    icon: Headphones,
    title: "Priority support",
    description:
      "Get quicker help when you need support with your Page or posts.",
  },
];

export default function LocalPartnerPage() {
  const [pages, setPages] = useState<OwnedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loadingPages, setLoadingPages] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPages() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setSignedIn(false);
          setLoadingPages(false);
          return;
        }

        setSignedIn(true);

        const { data, error } = await supabase
          .from("groups")
          .select("id, name, is_local_partner")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .order("name", { ascending: true });

        if (error) throw error;

        const ownedPages = (data ?? []) as OwnedPage[];
        const firstAvailable = ownedPages.find(
          (page) => !page.is_local_partner,
        );

        setPages(ownedPages);
        setSelectedPageId(firstAvailable?.id ?? "");
      } catch (error) {
        console.error("Failed to load Pages:", error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Your Pages could not be loaded.",
        );
      } finally {
        if (!cancelled) {
          setLoadingPages(false);
        }
      }
    }

    void loadPages();

    return () => {
      cancelled = true;
    };
  }, []);

  const availablePages = useMemo(
    () => pages.filter((page) => !page.is_local_partner),
    [pages],
  );

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch(
      "/api/stripe/create-partner-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId: selectedPageId,
        }),
      },
    );

    const payload = (await response.json()) as {
      clientSecret?: string;
      error?: string;
    };

    if (!response.ok || !payload.clientSecret) {
      throw new Error(
        payload.error || "Checkout could not be started.",
      );
    }

    return payload.clientSecret;
  }, [selectedPageId]);

  return (
    <>
      <SiteHeader />

      <main className="bg-white text-black">
        <section className="border-b border-black/10">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-12 lg:py-28">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Local Partnership
              </p>

              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                Support local.
                <br />
                Stand out locally.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-black/60">
                Become an ELO Local Partner and unlock more tools inside
                East Lothian Online.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#join"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800"
                >
                  Become a Partner
                  <ArrowRight className="h-5 w-5" />
                </a>

                <a
                  href="mailto:eastlothian.online@outlook.com"
                  className="inline-flex h-14 items-center justify-center rounded-2xl border border-black/15 px-6 text-sm font-black transition hover:border-black/30 hover:bg-black/[0.03]"
                >
                  Ask a question
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-700 text-white">
                  <BadgeCheck className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.15em] text-emerald-700">
                    ELO Local Partner
                  </p>

                  <p className="mt-1 text-sm font-bold text-black/50">
                    Built for local businesses
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <span className="text-5xl font-black tracking-[-0.05em]">
                    £9.99
                  </span>

                  <span className="pb-1 text-xl font-black text-black/35 line-through">
                    £19.99
                  </span>

                  <span className="pb-1 text-sm font-bold text-black/45">
                    per month
                  </span>
                </div>

                <p className="mt-3 text-sm font-black text-emerald-700">
                  Early bird price for the first 10 Local Partners.
                </p>

                <p className="mt-2 text-sm leading-6 text-black/55">
                  Extra tools for your East Lothian Online Page, with more
                  benefits still to come.
                </p>

                <p className="mt-3 text-sm leading-6 text-black/55">
                  Future benefits, including things like Partner merchandise,
                  will also be given retrospectively to existing Local
                  Partners.
                </p>
              </div>

              <div className="mt-8 space-y-4 border-t border-emerald-200 pt-7">
                {[
                  "Analytics",
                  "Local trends",
                  "More post types",
                  "Higher feed placement",
                  "Verified badge",
                  "Priority support",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                      <Check className="h-4 w-4" />
                    </div>

                    <p className="font-bold">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                What you get
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                More than a badge.
              </h2>

              <p className="mt-5 text-lg leading-8 text-black/60">
                Local Partnership gives your Page extra tools directly
                inside East Lothian Online.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article key={title} className="bg-white p-7 sm:p-8">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 text-xl font-black tracking-[-0.03em]">
                    {title}
                  </h3>

                  <p className="mt-3 leading-7 text-black/55">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>


        <section className="border-b border-black/10 bg-emerald-50">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12 lg:py-20">
            <div className="overflow-hidden rounded-3xl bg-emerald-100">
              <Image
                src="/ETHANEILIDH.jpg"
                alt="Ethan and Eilidh"
                width={1200}
                height={900}
                className="h-auto w-full object-cover"
              />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Our mission
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Built by Ethan &amp; Eilidh.
              </h2>

              <p className="mt-6 text-lg leading-8 text-black/65">
                We are building East Lothian Online to give the community one
                simple digital home for local events, deals, alerts, businesses
                and useful information.
              </p>

              <p className="mt-5 text-lg leading-8 text-black/65">
                Money from Local Partnership helps us be present at markets and
                events, meet more local people and businesses, improve the
                platform, and expand what East Lothian Online can do for the
                whole area.
              </p>

              <p className="mt-5 text-lg leading-8 text-black/65">
                Supporting ELO means helping us spend more time building,
                attending community events and making local information easier
                for everyone to find.
              </p>
            </div>
          </div>
        </section>

        <section id="join">
          <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Join today
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Choose which Page becomes a Local Partner.
              </h2>
            </div>

            <div className="mt-10 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
              {loadingPages ? (
                <p className="text-center font-bold text-black/50">
                  Loading your Pages...
                </p>
              ) : !signedIn ? (
                <div className="text-center">
                  <p className="text-lg font-black">
                    Sign in to continue.
                  </p>

                  <Link
                    href="/log-in?next=/localpartner"
                    className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white"
                  >
                    Sign in
                  </Link>
                </div>
              ) : availablePages.length === 0 ? (
                <div className="text-center">
                  <p className="text-lg font-black">
                    You need an approved Page that is not already a Local Partner.
                  </p>

                  <Link
                    href="/create-page"
                    className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white"
                  >
                    Create a Page
                  </Link>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="partner-page"
                    className="block text-sm font-black"
                  >
                    Select Page
                  </label>

                  <select
                    id="partner-page"
                    value={selectedPageId}
                    onChange={(event) => {
                      setSelectedPageId(event.target.value);
                      setCheckoutOpen(false);
                      setMessage("");
                    }}
                    className="mt-3 h-14 w-full rounded-2xl border border-black/15 bg-white px-4 font-bold outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  >
                    {availablePages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name}
                      </option>
                    ))}
                  </select>

                  {!checkoutOpen ? (
                    <button
                      type="button"
                      onClick={() => setCheckoutOpen(true)}
                      className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800"
                    >
                      Continue to payment
                    </button>
                  ) : null}

                  {checkoutOpen && selectedPageId ? (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
                      <EmbeddedCheckoutProvider
                        key={selectedPageId}
                        stripe={stripePromise}
                        options={{ fetchClientSecret }}
                      >
                        <EmbeddedCheckout />
                      </EmbeddedCheckoutProvider>
                    </div>
                  ) : null}
                </>
              )}

              {message ? (
                <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}