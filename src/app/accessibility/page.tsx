import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export default function AccessibilityPage() {
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
              Accessibility
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
              East Lothian Online should be useful to everyone. We are committed
              to making the platform clear, simple and accessible across
              different devices, browsers and ways of navigating the web.
            </p>

            <p className="mt-6 text-sm text-black/50">
              Last updated: 25 July 2026
            </p>
          </header>

          <div className="divide-y divide-black/10">
            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Our approach
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  We aim to build accessibility into East Lothian Online from
                  the beginning rather than treating it as an afterthought.
                </p>

                <p>
                  That means keeping pages easy to understand, controls easy to
                  use and important local information easy to find.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                What we are working towards
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>We aim for the platform to support:</p>

                <ul className="space-y-3 pl-5">
                  <li className="list-disc">
                    Keyboard navigation without requiring a mouse.
                  </li>
                  <li className="list-disc">
                    Clear focus states so users can see where they are on the
                    page.
                  </li>
                  <li className="list-disc">
                    Screen readers and other assistive technologies.
                  </li>
                  <li className="list-disc">
                    Text resizing and browser zoom without breaking the layout.
                  </li>
                  <li className="list-disc">
                    Strong contrast between text, backgrounds and controls.
                  </li>
                  <li className="list-disc">
                    Clear headings, labels and link descriptions.
                  </li>
                  <li className="list-disc">
                    Mobile, tablet and desktop use.
                  </li>
                  <li className="list-disc">
                    Reduced motion preferences where animation is used.
                  </li>
                </ul>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Clear local information
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Accessibility is not only technical. Information should also
                  be written clearly and presented in a way that is easy to
                  scan and understand.
                </p>

                <p>
                  We encourage organisations to use plain language, meaningful
                  titles and accurate event, place and opening information.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Images and media
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Where images provide important information, we aim to include
                  useful alternative text or present the same information in
                  nearby written content.
                </p>

                <p>
                  Decorative images should not create unnecessary noise for
                  people using screen readers.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Third-party content
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Some pages may link to maps, booking systems, social media
                  pages or other services operated by third parties.
                </p>

                <p>
                  We do not control the accessibility of those services, but we
                  will avoid relying on them as the only way to access important
                  information where reasonably possible.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Known limitations
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  East Lothian Online is still developing, and some parts of the
                  platform may not yet work perfectly for every user or
                  assistive technology.
                </p>

                <p>
                  We will continue reviewing the site and improving issues as
                  they are identified.
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Tell us about a problem
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  Accessibility problems are often easiest to fix when we know
                  exactly what happened.
                </p>

                <p>
                  Please tell us which page you were using, what you were trying
                  to do, what device or browser you were using and what went
                  wrong.
                </p>

                <p>
                  You can contact us at{" "}
                  <a
                    href="mailto:hello@eastlothian.online"
                    className="font-semibold text-black underline decoration-black/30 underline-offset-4 transition hover:decoration-black"
                  >
                    hello@eastlothian.online
                  </a>
                  .
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-bold tracking-tight text-black">
                Alternative access
              </h2>

              <div className="mt-5 space-y-4 text-base leading-7 text-black/75">
                <p>
                  If you cannot access information on East Lothian Online, let
                  us know what you need and we will make a reasonable effort to
                  provide it in another accessible format.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}