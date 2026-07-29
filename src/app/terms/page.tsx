import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
              These terms explain the rules for using East Lothian Online,
              creating an account and publishing content on the platform.
            </p>

            <p className="mt-6 text-sm text-black/50">
              Last updated: 25 July 2026
            </p>
          </header>

          <div className="divide-y divide-black/10">
            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                About these terms
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  These Terms of Service apply when you access or use East
                  Lothian Online, create an account, submit information or
                  publish content through the platform.
                </p>

                <p>
                  By using East Lothian Online, you agree to follow these terms.
                  If you do not agree with them, you should not use the service.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Your account
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  You are responsible for providing accurate account
                  information and keeping your sign-in details secure.
                </p>

                <p>
                  You must not access another person&apos;s account without
                  permission, impersonate another person or business, or create
                  an account for a misleading or unlawful purpose.
                </p>

                <p>
                  Please contact us promptly if you believe your account has
                  been accessed without permission.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Content you submit
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  You remain responsible for the information, images, listings,
                  events, deals, alerts and other content you submit to East
                  Lothian Online.
                </p>

                <p>
                  You must have the right to publish anything you submit. Your
                  content must be accurate to the best of your knowledge and
                  must not infringe another person&apos;s rights.
                </p>

                <p>
                  By submitting content, you give East Lothian Online a
                  non-exclusive, royalty-free permission to host, display,
                  reproduce and format that content as reasonably required to
                  operate and promote the platform. You continue to own your
                  content.
                </p>

                <p>
                  You may ask us to remove content you submitted, although
                  limited copies may remain where reasonably necessary for
                  backups, security, legal compliance or record keeping.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Content that is not allowed
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>You must not use East Lothian Online to publish or share:</p>

                <ul className="space-y-3 pl-5">
                  <li className="list-disc">
                    Illegal, fraudulent, threatening or deliberately misleading
                    content.
                  </li>
                  <li className="list-disc">
                    Harassment, hate speech or content intended to intimidate
                    another person.
                  </li>
                  <li className="list-disc">
                    Material that infringes copyright, trade marks, privacy or
                    other rights.
                  </li>
                  <li className="list-disc">
                    Spam, scams, malicious software or attempts to interfere
                    with the platform.
                  </li>
                  <li className="list-disc">
                    False business information, invented events or offers that
                    are not genuinely available.
                  </li>
                </ul>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Listings, events and local information
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online helps people discover information
                  submitted by businesses, organisations, event organisers and
                  members of the community.
                </p>

                <p>
                  Opening hours, prices, availability, dates, locations and
                  other details may change. You should confirm important
                  information directly with the relevant business or organiser
                  before travelling, booking or making a purchase.
                </p>

                <p>
                  The appearance of a business, event, deal or organisation on
                  East Lothian Online does not automatically mean that we
                  endorse, guarantee or recommend it.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Moderation and removal
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  We may review, refuse, edit, restrict or remove content where
                  we reasonably believe it breaks these terms, creates a safety
                  or legal risk, misleads users, harms the platform or is no
                  longer relevant.
                </p>

                <p>
                  We may suspend or close accounts that repeatedly or seriously
                  break these terms. Where practical, we will try to explain
                  significant moderation decisions.
                </p>

                <p>
                  We are not required to publish every submission and cannot
                  guarantee that content will remain available indefinitely.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Local Partnerships and paid services
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Some business features may be offered as paid services,
                  including Local Partnerships or other promotional options.
                </p>

                <p>
                  The price, billing period, included features and cancellation
                  information will be shown when the service is purchased or
                  agreed.
                </p>

                <p>
                  Paying for a service does not allow a user or business to
                  publish prohibited, unlawful or misleading content, and it
                  does not prevent us from applying these terms.
                </p>

                <p>
                  Nothing in these terms limits any rights you have under
                  applicable consumer law.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Platform availability
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  We work to keep East Lothian Online available, accurate and
                  secure, but we cannot promise that the service will always be
                  uninterrupted or error-free.
                </p>

                <p>
                  We may update, change, suspend or withdraw parts of the
                  platform where reasonably necessary for maintenance,
                  security, development or operational reasons.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Third-party services and links
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online may contain links to third-party websites,
                  maps, booking services, payment providers or social media
                  pages.
                </p>

                <p>
                  Those services are operated independently and have their own
                  terms and privacy practices. We are not responsible for
                  content or services provided by third parties.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Intellectual property
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online&apos;s name, branding, software, design
                  and original platform content are protected by applicable
                  intellectual property law.
                </p>

                <p>
                  You may use the platform for its intended purpose, but you
                  must not copy, sell, reverse engineer, scrape at scale or
                  commercially reuse the platform or its content without
                  permission, except where the law expressly allows it.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Our responsibility
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  We do not exclude or limit responsibility where doing so would
                  be unlawful. This includes responsibility that cannot legally
                  be excluded under applicable consumer law.
                </p>

                <p>
                  Subject to that, East Lothian Online is not responsible for
                  losses caused by inaccurate third-party submissions, changes
                  made by businesses or organisers, third-party services, or
                  events outside our reasonable control.
                </p>

                <p>
                  Business users are responsible for decisions made using the
                  platform and for maintaining appropriate records, insurance
                  and professional advice for their activities.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Ending your use of the service
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  You may stop using East Lothian Online at any time. You may
                  also contact us to request closure of your account.
                </p>

                <p>
                  We may restrict or end access where reasonably necessary
                  because of a serious breach of these terms, unlawful activity,
                  security concerns or harm to other users or the platform.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Changes to these terms
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  We may update these terms as East Lothian Online develops or
                  where legal, security or operational requirements change.
                </p>

                <p>
                  The latest version will be published on this page with an
                  updated date. Where a change is significant, we will take
                  reasonable steps to bring it to the attention of affected
                  users.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Governing law
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  These terms are governed by the laws of Scotland. If you are a
                  consumer, you may also benefit from mandatory protections
                  provided by the law where you live.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Contact
              </h2>

              <p className="mt-5 text-base leading-7 text-black/75">
                For questions about these terms, account issues or content on
                the platform, email{" "}
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