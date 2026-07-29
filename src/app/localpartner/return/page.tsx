import Link from "next/link";
import {
  BadgeCheck,
  Clock3,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export default async function LocalPartnerReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string;
  }>;
}) {
  const { session_id: sessionId } =
    await searchParams;

  return (
    <>
      <SiteHeader />

      <main className="grid min-h-[70vh] place-items-center bg-white px-5 py-16 text-black">
        <section className="w-full max-w-xl rounded-3xl border border-black/10 p-8 text-center shadow-sm sm:p-10">
          {sessionId ? (
            <>
              <BadgeCheck className="mx-auto h-14 w-14 text-emerald-700" />

              <h1 className="mt-6 text-4xl font-black tracking-[-0.04em]">
                Welcome, Local Partner.
              </h1>

              <p className="mt-4 leading-7 text-black/55">
                Your subscription has been received and Local Partner benefits
                should be applied automatically to the Page you selected.
              </p>

              <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900">
                Local Partnership is currently in Beta. If your benefits are not
                applied automatically, we will manually apply them within 24
                hours.
              </div>

              <p className="mt-7 text-lg font-black">
                Thank you,
              </p>

              <p className="mt-3 leading-7 text-black/55">
                Your support helps us keep building East Lothian Online,
                improve the platform and be more present at local markets and
                events.
              </p>

              <p className="mt-5 font-black text-emerald-700">
                Ethan &amp; Eilidh
              </p>
            </>
          ) : (
            <>
              <Clock3 className="mx-auto h-14 w-14 text-amber-600" />

              <h1 className="mt-6 text-4xl font-black tracking-[-0.04em]">
                Payment is processing.
              </h1>

              <p className="mt-4 leading-7 text-black/55">
                Local Partnership is currently in Beta. Once payment is
                confirmed, your benefits should be applied automatically. If
                they are not, we will manually apply them within 24 hours.
              </p>

              <p className="mt-7 font-black text-emerald-700">
                Thank you from Ethan &amp; Eilidh.
              </p>
            </>
          )}

          <Link
            href="/account"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            Go to your account
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}