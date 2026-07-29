import Link from "next/link";
import { ArrowRight } from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <header className="border-b border-black/15 pb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">
              East Lothian Online
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-black sm:text-5xl">
              About us
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
              East Lothian Online was built to make finding something local
              simple, quick and useful.
            </p>
          </header>

          <div className="divide-y divide-black/10">
            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                It started with frustration
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Finding out what was happening locally often meant scrolling
                  through adverts, unrelated posts and pages that had not been
                  updated in weeks.
                </p>

                <p>
                  Then, when something genuinely interesting finally appeared,
                  it had already happened.
                </p>

                <p>
                  East Lothian Online was created to fix that. One place to see
                  what is happening, what is available and where you can go
                  next.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Built with local knowledge
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Ethan moved from Edinburgh to East Lothian after meeting his
                  wife, Eilidh.
                </p>

                <p>
                  While Ethan was new to the area, Eilidh had lived in East
                  Lothian her whole life. Her knowledge of the towns, villages,
                  businesses and communities helped shape the platform from the
                  beginning.
                </p>

                <p>
                  Eilidh now runs East Lothian Online&apos;s social media and
                  helps local organisations share what they are doing with the
                  people looking for it.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                What East Lothian Online is
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  It is the easiest way to find out what is happening locally
                  without the drama, noise and endless adverts.
                </p>

                <p>
                  East Lothian Online is not trying to become a social network,
                  a marketplace or a platform that does everything.
                </p>

                <p>
                  Every new feature has to make it easier for someone to find
                  something local they can actually go and do. If it does not,
                  it probably belongs somewhere else.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                When it started feeling real
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  There was no single launch moment where everything suddenly
                  changed.
                </p>

                <p>
                  Instead, local businesses began tagging East Lothian Online
                  in their posts without being asked. For many organisations,
                  adding ELO alongside their normal hashtags simply became part
                  of how they shared what was happening.
                </p>

                <p>
                  That was when it began to feel less like an idea and more like
                  part of the local landscape.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Success means getting you off the site
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Most websites are designed to keep people on them for as long
                  as possible. East Lothian Online is not.
                </p>

                <p>
                  The goal is for someone to arrive, quickly find something
                  that makes them excited, put their phone away and head
                  straight there.
                </p>

                <p>
                  The best part of their day should not be the website. It
                  should be what they discovered because of it.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Built to become ordinary
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  The long-term goal is not for people to sit around talking
                  about how brilliant East Lothian Online is.
                </p>

                <p>
                  The goal is for it to become something people use without
                  thinking. You want to know what is happening, so you check
                  ELO, find an answer and get on with your day.
                </p>

                <p>
                  The most useful tools often become invisible. They simply
                  solve the problem when you need them.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                East Lothian Online is not for sale
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online was built to serve East Lothian, not to
                  be grown and sold.
                </p>

                <p>
                  People sometimes ask why it was built. The better question is
                  why nobody had already built it.
                </p>
              </div>
            </section>
          </div>

          <div className="border-t border-black/15 pt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-semibold text-emerald-700 transition hover:gap-3 hover:text-emerald-800"
            >
              Explore East Lothian
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}