import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
              East Lothian Online collects only the information needed to run
              the platform securely, understand how it is used and improve the
              local experience.
            </p>

            <p className="mt-6 text-sm text-black/50">
              Last updated: 25 July 2026
            </p>
          </header>

          <div className="divide-y divide-black/10">
            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Information we collect
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Depending on how you use East Lothian Online, we may collect
                  your email address and basic account information when you
                  create an account.
                </p>

                <p>
                  We also store information you choose to publish, such as
                  business pages, events, deals, alerts and other local content.
                </p>

                <p>
                  Search activity is stored only as anonymous, aggregated data
                  so we can understand what people are looking for and improve
                  search results. It is not linked to individual users.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Cookies
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online does not use advertising or marketing
                  cookies.
                </p>

                <p>
                  We only use cookies and similar storage that are necessary for
                  authentication, account security and keeping you signed in.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Analytics
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  We use Vercel Analytics to understand general site usage and
                  performance, such as page visits, traffic levels and technical
                  performance.
                </p>

                <p>
                  This helps us improve East Lothian Online without using
                  advertising trackers.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                How your data is stored
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online uses Supabase for authentication, account
                  management and application data storage.
                </p>

                <p>
                  We take reasonable technical and organisational measures to
                  protect the information held by the platform.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                How we use your information
              </h2>

              <ul className="mt-5 space-y-3 text-base leading-7 text-black/75">
                <li>To create, secure and maintain your account.</li>
                <li>To let you publish and manage local content.</li>
                <li>To improve search quality and site performance.</li>
                <li>To prevent misuse and keep the platform reliable.</li>
                <li>To respond when you contact us for support.</li>
              </ul>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Third-party services
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online currently relies on Supabase for
                  authentication and data storage, and Vercel for hosting and
                  analytics.
                </p>

                <p>
                  These providers may process limited technical information as
                  required to provide their services.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Your rights
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Under applicable UK data protection law, you may have the
                  right to request access to, correction of or deletion of your
                  personal information.
                </p>

                <p>
                  You may also ask us to explain how your information is used or
                  raise a concern about how it has been handled.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Contact
              </h2>

              <p className="mt-5 text-base leading-7 text-black/75">
                For questions about this Privacy Policy or your personal
                information, email{" "}
                <a
                  href="mailto:hello@eastlothian.online"
                  className="font-semibold text-black underline decoration-black/30 underline-offset-4 transition hover:decoration-black"
                >
                  hello@eastlothian.online
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}