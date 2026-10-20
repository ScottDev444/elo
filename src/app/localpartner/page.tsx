"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    icon: ArrowUp,
    title: "Stand out on the noticeboard",
    description:
      "Local Partner posts are placed above standard posts, giving your notices stronger visibility across ELO.",
  },
  {
    icon: BarChart3,
    title: "See how your Page performs",
    description:
      "Use Page analytics to understand how local people are finding and engaging with your presence on ELO.",
  },
  {
    icon: LineChart,
    title: "See what locals are looking for",
    description:
      "Use Local Trends to see what people across East Lothian are searching for and turn that insight into better posts.",
  },
  {
    icon: Megaphone,
    title: "Post more kinds of notices",
    description:
      "Unlock extra Local Partner post types so your Page has more ways to share useful, timely and promotional content.",
  },
  {
    icon: BadgeCheck,
    title: "Be clearly recognised",
    description:
      "Your verified Local Partner badge helps your Page stand out and be recognised across East Lothian Online.",
  },
  {
    icon: Headphones,
    title: "Get priority support",
    description:
      "Get quicker help with your Page, posts and Local Partner features when you need it.",
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

      <main className="min-h-screen bg-[#F4F5F4] text-[#17221F]">
        <section className="mx-auto w-full max-w-[760px] px-[18px] pb-28 pt-6 sm:pt-8">
          <header className="pb-5">
            <div className="text-[9px] font-black uppercase tracking-[1.3px] text-[#005744]">
              ELO LOCAL PARTNER
            </div>

            <h1 className="mt-2 max-w-[620px] text-[34px] font-black leading-[1.02] tracking-[-1.1px] text-[#111614] sm:text-[42px]">
              Stand out on East Lothian&apos;s
              <br />
              digital noticeboard.
            </h1>

            <p className="mt-4 max-w-[630px] text-[14px] leading-6 text-[#68736F] sm:text-[15px]">
              Put your Page in a stronger position across ELO. Get your
              notices seen sooner, understand what locals are looking for and
              unlock more ways to post.
            </p>
          </header>

          <section className="overflow-hidden rounded-[24px] bg-[#005744] p-5 text-white shadow-[0_16px_40px_rgba(0,87,68,0.16)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/12">
                <BadgeCheck size={25} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black uppercase tracking-[1.2px] text-white/65">
                  LOCAL PARTNER
                </div>

                <h2 className="mt-1 text-[20px] font-black tracking-[-0.4px]">
                  More from every notice
                </h2>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-x-3">
              <span className="text-[48px] font-black leading-none tracking-[-2.2px]">
                £19.99
              </span>

              <span className="pb-1 text-[13px] font-bold text-white/70">
                per month
              </span>
            </div>

            <p className="mt-3 max-w-[560px] text-[13px] leading-5 text-white/78">
              Give your Page stronger visibility across the noticeboard,
              better local insight and more ways to keep East Lothian updated.
            </p>

            <a
              href="#join"
              className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 text-[13px] font-black text-[#005744] transition hover:bg-[#F2F7F5]"
            >
              Become a Local Partner
              <ArrowRight size={18} />
            </a>
          </section>

          <section className="mt-8">
            <div className="text-[9px] font-black uppercase tracking-[1.3px] text-[#005744]">
              WHAT YOU GET
            </div>

            <h2 className="mt-2 text-[27px] font-black leading-8 tracking-[-0.7px] text-[#111614]">
              More ways to stand out, post and understand your local audience.
            </h2>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-[#D6DDDA] bg-white">
              {benefits.map(({ icon: Icon, title, description }, index) => (
                <article
                  key={title}
                  className={`flex gap-3 p-4 sm:p-5 ${
                    index !== benefits.length - 1
                      ? "border-b border-[#E3E7E5]"
                      : ""
                  }`}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#EAF4F0] text-[#005744]">
                    <Icon size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-black text-[#1C2925]">
                      {title}
                    </h3>

                    <p className="mt-1 text-[11px] leading-[17px] text-[#74807C]">
                      {description}
                    </p>
                  </div>

                  <Check
                    size={17}
                    className="mt-1 shrink-0 text-[#005744]"
                  />
                </article>
              ))}
            </div>
          </section>

          <section
            id="join"
            className="mt-8 scroll-mt-24 rounded-[24px] border border-[#C8D7D1] bg-white p-5 shadow-[0_12px_32px_rgba(23,34,31,0.06)] sm:p-6"
          >
            <div className="text-[9px] font-black uppercase tracking-[1.3px] text-[#005744]">
              BECOME A LOCAL PARTNER
            </div>

            <h2 className="mt-2 text-[27px] font-black leading-8 tracking-[-0.7px] text-[#111614]">
              Put your Page at the heart of the noticeboard.
            </h2>

            <p className="mt-3 text-[12px] leading-[19px] text-[#68736F]">
              Become a Local Partner for £19.99 per month and unlock the full
              set of Partner benefits for your approved Page.
            </p>

            <div className="mt-5 border-t border-[#E2E7E4] pt-5">
              {loadingPages ? (
                <div className="flex min-h-[120px] items-center justify-center">
                  <span className="text-[12px] font-bold text-[#74807C]">
                    Loading your Pages...
                  </span>
                </div>
              ) : !signedIn ? (
                <div className="rounded-[16px] bg-[#F4F5F4] p-4 text-center">
                  <p className="text-[14px] font-black text-[#1C2925]">
                    Sign in to upgrade a Page.
                  </p>

                  <Link
                    href="/log-in?next=/localpartner"
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-[#005744] px-5 text-[12px] font-black text-white"
                  >
                    Sign in
                    <ArrowRight size={17} />
                  </Link>
                </div>
              ) : availablePages.length === 0 ? (
                <div className="rounded-[16px] bg-[#F4F5F4] p-4 text-center">
                  <p className="text-[14px] font-black text-[#1C2925]">
                    No eligible Pages yet.
                  </p>

                  <p className="mx-auto mt-2 max-w-[430px] text-[11px] leading-[17px] text-[#74807C]">
                    You need an approved Page that is not already a Local
                    Partner.
                  </p>

                  <Link
                    href="/create-page"
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-[#005744] px-5 text-[12px] font-black text-white"
                  >
                    Create a Page
                    <ArrowRight size={17} />
                  </Link>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="partner-page"
                    className="text-[12px] font-black text-[#1C2925]"
                  >
                    Page to upgrade
                  </label>

                  <select
                    id="partner-page"
                    value={selectedPageId}
                    onChange={(event) => {
                      setSelectedPageId(event.target.value);
                      setCheckoutOpen(false);
                      setMessage("");
                    }}
                    className="mt-2 h-[54px] w-full rounded-[14px] border border-[#D5DCDA] bg-[#F8F9F8] px-4 text-[13px] font-bold text-[#17221F] outline-none transition focus:border-[#005744]"
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
                      className="mt-4 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-[#005744] px-5 text-[13px] font-black text-white transition hover:bg-[#004B3A]"
                    >
                      Become a Local Partner · £19.99/month
                      <ArrowRight size={18} />
                    </button>
                  ) : null}

                  {checkoutOpen && selectedPageId ? (
                    <div className="mt-5 overflow-hidden rounded-[16px] border border-[#D6DDDA] bg-white">
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
                <p className="mt-4 rounded-[13px] bg-[#FDECEA] px-4 py-3 text-[11px] font-bold leading-[17px] text-[#A52B21]">
                  {message}
                </p>
              ) : null}
            </div>
          </section>

          <div className="mt-5 text-center">
            <a
              href="mailto:eastlothian.online@outlook.com"
              className="text-[11px] font-bold text-[#68736F] underline decoration-[#AAB6B1] underline-offset-4"
            >
              Have a question before upgrading?
            </a>
          </div>
        </section>
      </main>

    </>
  );
}