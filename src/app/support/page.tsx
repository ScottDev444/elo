export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] px-6 py-16 text-[#122018]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#087755]">
            East Lothian Online
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Support
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#526057]">
            Need help with East Lothian Online? We’re here to help with
            accounts, Pages, posts, Places, Partnership and general app
            support.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-black/10 bg-white p-7">
          <h2 className="text-xl font-semibold">
            Contact Support
          </h2>

          <p className="mt-3 leading-7 text-[#526057]">
            For support, questions or technical issues, email:
          </p>

          <a
            href="mailto:hello@eastlothian.online"
            className="mt-4 inline-block font-semibold text-[#087755] hover:underline"
          >
            hello@eastlothian.online
          </a>
        </section>

        <section className="mb-6 rounded-2xl border border-black/10 bg-white p-7">
          <h2 className="text-xl font-semibold">
            In-App Support
          </h2>

          <p className="mt-3 leading-7 text-[#526057]">
            Registered users can also contact us directly through the
            support section inside the East Lothian Online app.
          </p>
        </section>

        <section className="mb-6 rounded-2xl border border-black/10 bg-white p-7">
          <h2 className="text-xl font-semibold">
            Organisation Pages
          </h2>

          <p className="mt-3 leading-7 text-[#526057]">
            New organisation Pages are manually reviewed before they are
            approved. If you have created a Page and are waiting for
            verification, no further action is normally required.
          </p>
        </section>

        <section className="mb-6 rounded-2xl border border-black/10 bg-white p-7">
          <h2 className="text-xl font-semibold">
            Partnership
          </h2>

          <p className="mt-3 leading-7 text-[#526057]">
            If you need assistance with ELO Partnership, subscription
            access or Partnership features, contact us using the email
            address above.
          </p>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-7">
          <h2 className="text-xl font-semibold">
            Reporting a Problem
          </h2>

          <p className="mt-3 leading-7 text-[#526057]">
            When reporting a technical issue, please include a short
            description of what happened and, where possible, a
            screenshot. This helps us investigate the problem quickly.
          </p>
        </section>

        <p className="mt-10 text-sm text-[#6b756e]">
          East Lothian Online · East Lothian, Scotland
        </p>
      </div>
    </main>
  );
}